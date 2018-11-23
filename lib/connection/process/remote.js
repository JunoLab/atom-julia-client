'use babel'

import tcp from './tcp'
import * as pty from 'node-pty-prebuilt'
import net from 'net'
import { paths, mutex } from '../../misc'
import * as ssh from 'ssh2'

export var lock = mutex()

let getRemoteConf = undefined
let getRemoteName = undefined
let serversettings = {}

export function get (path, args) {
  return lock((release) => {
    let p = get_(path, args)
    release(p.then(({socket}) => socket))
    return p
  })
}

function getConnectionSettings () {
  return new Promise((resolve, reject) => {
    if (getRemoteConf) {
      let conf = getRemoteConf('Juno requests access to your server configuration to open a terminal.')
      conf.then(conf => resolve(conf)).catch(reason => reject(reason))
    } else {
      reject('nopackage')
    }
  })
}

export function withRemoteConfig (f) {
  return new Promise((resolve, reject) => {
    if (getRemoteName === undefined) {
      reject()
    } else {
      getRemoteName().then(name => {
        name = name.toString()
        if (serversettings[name]) {
          resolve(f(serversettings[name]))
        } else {
          getConnectionSettings().then(conf => {
            serversettings[name] = conf
            resolve(f(conf))
          }).catch(reason => {
            showRemoteError(reason)
            reject()
          })
        }
      }).catch(reason => {
        showRemoteError(reason)
        reject()
      })
    }
  })
}

function showRemoteError (reason) {
  if (reason == 'nopackage') {
    atom.notifications.addInfo('ftp-remote-edit not installed')
  } else if (reason == 'noservers') {
    let notif = atom.notifications.addInfo('Please select a project', {
      description: `Connect to a server in the ftp-remote-edit tree view.`,
      dismissable: true,
      buttons: [
        {
          text: 'Togle Remote Tree View',
          onDidClick: () => {
            let edview = atom.views.getView(atom.workspace.getActiveTextEditor())
            atom.commands.dispatch(edview, 'ftp-remote-edit:toggle')
            notif.dismiss()
          }
        }
      ]
    })
  }
}

export function consumeGetServerConfig (getconf) {
  getRemoteConf = getconf
}

export function consumeGetServerName (name) {
  getRemoteName = name
}

export function get_ (path, args) {
  return withRemoteConfig(conf => {
    return new Promise((resolve, reject) => {
      tcp.listen().then((port) => {
        let conn = new ssh.Client()

        conn.on('ready', () => {
          conn.forwardIn('127.0.0.1', port, err => {
            if (err) {
              console.error(`Error while forwarding remote connection from ${port}: ${err}`)
              atom.notifications.addError(`Port in use`, {
                description: `Port ${port} on the remote server already in use.
                              Try again with another port.`
              })
              reject()
            }
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
        }).connect(conf)
      })
    })
  })
}

function socket (ty) {
  return tcp.next()
}
