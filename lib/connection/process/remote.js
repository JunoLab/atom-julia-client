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

export function get_ (path, args) {
  return new Promise((resolve, reject) => {
    tcp.listen().then((port) => {
      console.log("juno listening on port "+port)
      let conn = new ssh.Client()

      conn.on('ready', () => {
        conn.forwardIn('127.0.0.1', 8888, err => {
        })
        conn.shell((err, stream) => {
          if (err) console.error(err)

          stream.on('close', () => {
            conn.end()
          })

          let sock = socket(stream)

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
          console.log(proc)
          resolve(proc)
        })
      }).on('tcp connection', (info, accept, reject) => {
        let stream = accept() // connect to forwarded connection
        // start server that the julia server can connect to
        let sock = net.createConnection({port: port}, () => {
          stream.pipe(sock).pipe(stream)
        })
      }).connect({
        host: 'micha-eis.nerdpol.ovh',
        port: 24,
        username: 'basti',
        privateKey: require('fs').readFileSync('/home/pfitzseb/.ssh/serverhome_openssh'),
        passphrase: ""
      })
    })
  })
}

function socket (ty) {
  return tcp.next()
}
