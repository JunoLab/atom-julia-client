'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import { debounce } from 'underscore-plus'

var id = 0

var {changemodule} = client.import({msg: ['changemodule']})

export function activate (ink) {
  let subs = new CompositeDisposable()

  let terminal = ink.InkTerminal.fromId('julia-terminal')

  // powershell: `Start-process "${paths.jlpath()}" -NoNewWindow -wait -ArgumentList "-i -e \`"using Juno; Juno.connect(${port})\`""`
  tcp.listen().then((port) => terminal.execute(`"${paths.jlpath()}" -i -e "using Juno; Juno.connect(${port})"`))
  terminal.getTitle = function () {return 'Console'}
  modules.onDidChange(debounce(() => changemodule({mod: modules.current(), cols: terminal.terminal.cols}), 200))

  client.handle({updateWorkspace: () => require('./workspace').update()})

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
