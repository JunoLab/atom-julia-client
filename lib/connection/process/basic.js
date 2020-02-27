'use babel'

import tcp from './tcp'
import * as pty from 'node-pty-prebuilt-multiarch'
import net from 'net'
import { paths, mutex } from '../../misc'

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
  return getUnix(path, args, env)
}

export function customEnv (env = process.env) {
  let confnt = atom.config.get('julia-client.juliaOptions.numberOfThreads')
  let confntInt = parseInt(confnt)

  if (confnt == 'auto') {
    env.JULIA_NUM_THREADS = require('physical-cpu-count')
  } else if (confntInt != 0 && isFinite(confntInt)) {
    env.JULIA_NUM_THREADS = confntInt
  }

  if (atom.config.get('julia-client.disableProxy')) {
    delete env.HTTP_PROXY
    delete env.HTTPS_PROXY
    delete env.http_proxy
    delete env.https_proxy
  }

  return env
}

function getUnix (path, args, env) {
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
            useConpty: true
          })

          let sock = socket(ty)

          sock.catch((err) => reject(err))

          let proc = {
            ty: ty,
            kill: () => ty.kill(),
            interrupt: () => ty.write('\x03'),
            socket: sock,
            onExit: (f) => ty.on('exit', f),
            onStderr: (f) => {},
            onStdout: (f) => ty.on('data', f)
          }

          resolve(proc)
        }).catch((err) => {
          reject(err)
        })
      }).catch((err) => {
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}

function freePort() {
  return new Promise((resolve) => {
    let server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      let port = server.address().port
      server.close()
      resolve(port)
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
