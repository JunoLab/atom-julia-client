'use babel'

import tcp from './tcp'
import pty from 'pty.js'
import { paths, mutex } from '../../misc'

export var lock = mutex()

export function get_ (path, args) {
  return new Promise((resolve, reject) => {
    tcp.listen().then((port, server) => {
      let env = process.env
      let confnt = atom.config.get('julia-client.juliaOptions.numberOfThreads')
      let confntInt = parseInt(confnt)

      if (confnt == 'auto') {
        env.JULIA_NUM_THREADS = require('physical-cpu-count')
      } else if (confntInt != 0 && isFinite(confntInt)) {
        env.JULIA_NUM_THREADS = confntInt
      }

      // use Atom as the default editor for Julia
      env["JULIA_EDITOR"] = "atom -a"

      paths.fullPath(path).then((path) => {
        // space before port needed for pty.js on windows:
        let ty = pty.spawn(path, [...args, '-i', paths.script('boot_repl.jl'), ` ${port}`], {
          cols: 100,
          rows: 30,
          env: env
        })

        let sock = socket(ty)

        sock.catch((err) => reject(err))

        let proc = {
          ty: ty,
          kill: () => ty.kill(),
          interrupt: () => ty.kill('SIGINT'),
          socket: sock,
          onExit: (f) => ty.on('exit', f),
          onStderr: (f) => {},
          onStdout: (f) => {}
        }

        resolve(proc)
      })
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

export function get (path, args) {
  return lock((release) => {
    let p = get_(path, args)
    release(p.then(({socket}) => socket))
    return p
  })
}
