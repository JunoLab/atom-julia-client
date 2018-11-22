'use babel'

import tcp from './tcp'
import * as pty from 'node-pty-prebuilt'
import net from 'net'
import { paths, mutex } from '../../misc'
import * as ssh from 'ssh2'

export var lock = mutex()

export function get (path, args) {
  return lock((release) => {
    let p = get_(path, args)
    release(p.then(({socket}) => socket))
    return p
  })
}

export function getConnectionSettings () {
  let settings = atom.config.get('julia-client.remoteOptions')

  let connectionSettings = {}
  if (settings.usekeyfile) {
    connectionSettings = {
      host: settings.server,
      port: settings.port,
      username: settings.username,
      privateKey: require('fs').readFileSync(settings.keyfile),
      passphrase: settings.passphrase
    }
  } else {
    connectionSettings = {
      host: settings.server,
      port: settings.port,
      username: settings.username,
      password: settings.passphrase
    }
  }
  return connectionSettings
}

export function get_ (path, args) {
  let connectionSettings = getConnectionSettings()

  return new Promise((resolve, reject) => {
    tcp.listen().then((port) => {
      let conn = new ssh.Client()

      conn.on('ready', () => {
        conn.forwardIn('127.0.0.1', port, err => {
          if (err) console.error(`Error while forwarding remote connection from ${port}`)
        })
        let exec = `${atom.config.get('julia-client.remoteOptions.remoteJulia')} --color=yes -i -e "using Atom; using Juno; Juno.connect(${port})"`
        conn.exec(exec, {pty: true}, (err, stream) => {
          if (err) console.error(`Error while executing command \n\`${exec}\`\n on remote server.`)

          stream.on('close', () => {
            conn.end()
          })

          let sock = socket(stream)

          // forward resize handling
          stream.resize = (cols, rows) => stream.setWindow(rows, cols, 999, 999)
          let proc = {
            ty: stream,
            kill: () => stream.signal('KILL'),
            interrupt: () => stream.signal('SIGINT'),
            interruptREPL: () => stream.write('\x03'),
            socket: sock,
            onExit: (f) => stream.on('close', f),
            onStderr: (f) => stream.stderr.on('data', data => f(data.toString())),
            onStdout: (f) => stream.on('data', data => f(data.toString())),
          }
          resolve(proc)
        })
      }).on('tcp connection', (info, accept, reject) => {
        let stream = accept() // connect to forwarded connection
        // start server that the julia server can connect to
        let sock = net.createConnection({ port: port }, () => {
          stream.pipe(sock).pipe(stream)
        })
      }).connect(connectionSettings)
    })
  })
}

function socket (ty) {
  return tcp.next()
}
