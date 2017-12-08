'use babel'

import tcp from './tcp'
import pty from 'pty.js'

// FIXME: Need to take `args` and ENV vars into account (see basic.coffee).
export function get (path, args) {
  return new Promise((resolve) => {
    tcp.listen().then((port, server) => {
      let ty = pty.fork(atom.config.get("julia-client.terminal"), [], {
        cols: 100,
        rows: 30
      })
      ty.write(`"${path}" -i -e "using Juno; Juno.connect(${port})"\r\n`)

      let proc = {
        ty: ty,
        kill: () => ty.write('\x04'),
        interrupt: () => ty.write('\x03'), // FIXME: doesn't work when evaling in an editor... :/
        socket: tcp.next()
      }

      resolve(proc)
    })
  })
}
