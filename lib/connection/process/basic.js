'use babel'

import tcp from './tcp'
import * as pty from 'node-pty-prebuilt-multiarch'
import net from 'net'
import { paths, mutex } from '../../misc'
import { jlNotFound } from '../messages'

export var lock = mutex()

export function get (path, args) {
  return lock((release) => {
    let p = get_(path, args)
    p.catch((err) => {
      release()
    })
    release(p.then(({socket}) => socket))
    return p
  })
}

export function get_ (path, args) {
  const env = customEnv()
  return getProcess(path, args, env)
}

export function customEnv (env = process.env) {
  let confnt = atom.config.get('julia-client.juliaOptions.numberOfThreads')
  let pkgServer = atom.config.get('julia-client.juliaOptions.packageServer')
  let confntInt = parseInt(confnt)

  if (confnt == 'auto') {
    env.JULIA_NUM_THREADS = require('physical-cpu-count')
  } else if (confntInt != 0 && isFinite(confntInt)) {
    env.JULIA_NUM_THREADS = confntInt
  }

  if (pkgServer) {
    env.JULIA_PKG_SERVER = pkgServer
  }

  if (atom.config.get('julia-client.disableProxy')) {
    delete env.HTTP_PROXY
    delete env.HTTPS_PROXY
    delete env.http_proxy
    delete env.https_proxy
  }

  return env
}

function getProcess (path, args, env) {
  return new Promise((resolve, reject) => {
    tcp.listen().then((port) => {
      paths.fullPath(path).then((path) => {
        paths.projectDir().then((cwd) => {
          // space before port needed for pty.js on windows:
          let ty = pty.spawn(path, [...args, paths.script('boot_repl.jl'), ` ${port}`], {
            cols: 100,
            rows: 30,
            env: env,
            cwd: cwd,
            useConpty: true,
            handleFlowControl: true
          })

          let sock = socket(ty)

          sock.catch((err) => {
            reject(err)
          })

          // catch errors when interacting with ty, just to be safe (errors might crash Atom)
          let proc = {
            ty: ty,
            kill: () => {
              // only kill pty if it's still alive:
              if (ty._readable || ty._writable) {
                try {
                  ty.kill()
                } catch (err) {
                  console.log('Terminal:')
                  console.log(err);
                }
              }
            },
            interrupt: () => {
              try {
                ty.write('\x03')
              } catch (err) {
                console.log('Terminal:')
                console.log(err);
              }
            },
            socket: sock,
            onExit: (f) => {
              try {
                ty.on('exit', f)
              } catch (err) {
                console.log('Terminal:')
                console.log(err);
              }
            },
            onStderr: (f) => {},
            onStdout: (f) => {
              try {
                ty.on('data', f)
              } catch (err) {
                console.log('Terminal:')
                console.log(err);
              }
            }
          }

          resolve(proc)
        }).catch((err) => {
          reject(err)
        })
      }).catch((err) => {
        jlNotFound(path, err)
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}

function socket (ty) {
  conn = tcp.next()
  failure = new Promise((resolve, reject) => {
    ty.on('exit', (err) => {
      conn.dispose()
      reject(err)
    })
  })
  return Promise.race([conn, failure])
}
