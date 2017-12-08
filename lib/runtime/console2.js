'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import pty from 'pty.js'
import { debounce } from 'underscore-plus'

var {changemodule} = client.import({msg: ['changemodule']})

export function activate (ink) {
  let subs = new CompositeDisposable()

  let terminal = ink.InkTerminal.fromId('julia-terminal')
  console.log(terminal);

  terminal.getTitle = () => {return 'Console'}
  modules.onDidChange(debounce(() => changemodule({mod: modules.current(), cols: terminal.terminal.cols}), 200))

  client.onBoot((ty) => terminal.attach(ty))

  client.handle({
    updateWorkspace: () => require('./workspace').update(),
    clearconsole: () => terminal.clear()
  })

  subs.add(atom.commands.add('atom-workspace', 'julia-client:julia-terminal', () => {
    client.boot()
    terminal.open().then(() => terminal.show())
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:new-terminal', () => {
    let term = ink.InkTerminal.fromId(`terminal${Math.floor(Math.random()*10000000)}`)

    term.attach(
      pty.fork(atom.config.get("julia-client.terminal"), [], {
        cols: 100,
        rows: 30
      })     
    )
    term.open().then(() => term.show())
  }))
}

export function deactivate () {
  subs.dispose()
}
