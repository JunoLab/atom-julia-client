'use babel'

import tcp from './tcp'
import pty from 'pty.js'

export function get (path, args) {
  return new Promise((resolve) => {
    tcp.listen().then((port, server) => {
      let env = process.env
      let confnt = atom.config.get('julia-client.juliaOptions.numberOfThreads')
      let confntInt = parseInt(confnt)

      if (confnt == 'auto') {
        env.JULIA_NUM_THREADS = require('physical-cpu-count')
      } else if (confntInt != 0 && isFinite(confntInt)) {
        env.JULIA_NUM_THREADS = confntInt
      }

      let ty = pty.spawn(path, [...args, '-i', '-e', `using Juno; Juno.connect(${port})`], {
        cols: 100,
        rows: 30,
        env: env
      })

      let proc = {
        ty: ty,
        kill: () => ty.kill(),
        interrupt: () => ty.kill('SIGINT'),
        socket: tcp.next(),
        onExit: (f) => ty.on('exit', f)
      }

      resolve(proc)
    })
  })
}
