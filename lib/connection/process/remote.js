'use babel'

import tcp from './tcp'
import * as pty from 'node-pty-prebuilt'
import net from 'net'
import { paths, mutex } from '../../misc'
import * as ssh from 'ssh2'
import fs from 'fs'

export var lock = mutex()

let getRemoteConf = undefined
let getRemoteName = undefined
let serversettings = {}
let currentServer = undefined

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
        let cachedSettings = serversettings[name]
        if (cachedSettings) {
          resolve(f(maybe_add_agent(cachedSettings)))
        } else {
          getConnectionSettings().then(conf => {
            serversettings[name] = conf
            resolve(f(maybe_add_agent(conf)))
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

function maybe_add_agent (conf) {
  if (conf && !conf.agent && atom.config.get('julia-client.remoteOptions.agentAuth')) {
    let sshsock = ssh_socket()
    if (sshsock) {
      conf.agent = sshsock
      conf.agentForward = atom.config.get('julia-client.remoteOptions.forwardAgent')
    }
  }
  return conf
}

function ssh_socket () {
  let sock = process.env['SSH_AUTH_SOCK']
  if (sock) {
    return sock
  } else {
    if (process.platform == 'win32') {
      return 'pageant'
    } else {
      return ''
    }
  }
}

const storageKey = 'juno_remote_server_exec_key'

function setRemoteExec (server, command) {
  let store = getRemoteStore()
  store[server] = command
  setRemoteStore(store)
}

function getRemoteExec (server) {
  let store = getRemoteStore()
  return store[server]
}

function setRemoteStore (store) {
  localStorage[storageKey] = JSON.stringify(store)
}

function getRemoteStore () {
  let store = localStorage[storageKey]
  if (store == undefined) {
    store = []
  } else {
    store = JSON.parse(store)
  }
  return store
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
            let edview = atom.views.getView(atom.workspace)
            atom.commands.dispatch(edview, 'ftp-remote-edit:toggle')
            notif.dismiss()
          }
        }
      ]
    })
  } else {
    atom.notifications.addError('Remote Connection Failed', {
      details: `Unknown Error: \n\n ${reason}`
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
    let execs = getRemoteExec(conf.name)
    if (!execs) {
      console.log("open a dialog and get config here")
    }
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
          let jlpath = atom.config.get('julia-client.remoteOptions.remoteJulia')
          let exec = ''
          if (atom.config.get('julia-client.remoteOptions.tmux')) {
            let sessionName = atom.config.get('julia-client.remoteOptions.tmuxName')
            exec = exec + `tmux new -s ${sessionName} `
            exec = exec + jlpath
            exec = exec + ' ' + args.join(' ')  + ' -e \''
            exec = exec + fs.readFileSync(paths.script('boot_repl.jl'))
            exec = exec + '\' ' + port
            exec = exec + ` || tmux send-keys -t ${sessionName}.{left} ^A ^K \'Juno.connect(${port})\' ENTER`
            exec = exec + ` && tmux attach -t ${sessionName} `
          } else {
            exec = exec + jlpath + ' ' + args.join(' ')  + ' -e \''
            exec = exec + fs.readFileSync(paths.script('boot_repl.jl'))
            exec = exec + '\' ' + port
          }

          conn.exec(exec, { pty: { term: "xterm-256color" } }, (err, stream) => {
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
              disconnect: () => stream.close(),
              interrupt: () => stream.write('\x03'), // signal handling doesn't seem to work :/
              interruptREPL: () => stream.write('\x03'),
              socket: sock,
              onExit: (f) => stream.on('close', f),
              onStderr: (f) => stream.stderr.on('data', data => f(data.toString())),
              onStdout: (f) => stream.on('data', data => f(data.toString())),
              config: conf
            }
            resolve(proc)
          })
        }).on('tcp connection', (info, accept, reject) => {
          let stream = accept() // connect to forwarded connection
          stream.on('close', () => {
            conn.end()
          })
          stream.on('error', () => {
            conn.end()
          })
          stream.on('finish', () => {
            conn.end()
          })
          // start server that the julia server can connect to
          let sock = net.createConnection({ port: port }, () => {
            stream.pipe(sock).pipe(stream)
          })
          sock.on('close', () => {
            conn.end()
          })
          sock.on('error', () => {
            conn.end()
          })
          sock.on('finish', () => {
            conn.end()
          })
        }).connect(conf)
      })
    })
  })
}

function socket (stream) {
  conn = tcp.next()
  failure = new Promise((resolve, reject) => {
    stream.on('close', (err) => {
      conn.dispose()
      reject(err)
    })
  })
  return Promise.race([conn, failure])
}
