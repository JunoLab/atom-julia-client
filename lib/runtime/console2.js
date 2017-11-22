'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'

var id = 0

export function activate (ink) {
  let terminal = ink.InkTerminal.fromId('jterminal')
  tcp.listen().then((port) => terminal.execute(`"${paths.jlpath()}" -i -e "using Juno; Juno.connect(${port})"`))
  terminal.getTitle = function () {return 'Console'}
  let subs = new CompositeDisposable()

  subs.add(atom.commands.add('atom-workspace', 'julia-client:julia-terminal', () => {
    terminal._open()
    terminal.show()
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:new-terminal', () => {
    let term = ink.InkTerminal.fromId(`terminal${(id += 1)}`)
    term.getTitle = function () {return `Terminal ${id}`}
    term._open()
    term.show()
  }))
}

export function deactivate () {
  subs.dispose()
}
