'use babel'

import tcp from './tcp'
import pty from 'pty.js'

export function get (path, args) {
  return new Promise((resolve) => {
    tcp.listen().then((port, server) => {
      let ty = pty.fork(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
        cols: 100,
        rows: 30
      })
      ty.write(`"${path}" -i -e "using Juno; Juno.connect(${port})"\r\n`)

      let proc = {
        ty: ty,
        kill: () => ty.write('\x04'),
        interrupt: () => ty.write('\x03'),
        socket: tcp.next()
      }

      resolve(proc)
    })
  })
}
