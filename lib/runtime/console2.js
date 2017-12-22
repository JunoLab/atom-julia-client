'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import pty from 'pty.js'
import { debounce, once } from 'underscore-plus'

var {changemodule} = client.import({msg: ['changemodule']})

export function activate (ink) {
  if (atom.config.get('julia-client.juliaOptions.consoleStyle') != 'REPL-based') return

  let subs = new CompositeDisposable()

  let terminal = ink.InkTerminal.fromId('julia-terminal')
  console.log(terminal);

  terminal.getTitle = () => {return 'Console'}
  terminal.class = 'julia-terminal'
  terminal.write('\x1b[32mPress Enter to start Julia.\x1b[0m')
  terminal.startRequested = () => client.boot()

  modules.onDidChange(debounce(() => changemodule({mod: modules.current(), cols: terminal.terminal.cols}), 200))

  client.onBoot((proc) => {
    terminal.attach(proc.ty)
    proc.onExit(() => {
      terminal.detach()
      terminal.write('\r\x1b[31mJulia has stopped.\x1b[0m  Press Enter to start a new session.')
    })
  })

  client.handle({
    updateWorkspace: () => require('./workspace').update(),
    clearconsole: () => terminal.clear()
  })

  subs.add(atom.commands.add('atom-workspace', 'julia-client:open-console', () => {
    terminal.open().then(() => terminal.show())
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:clear-terminal', () => {
    terminal.clear()
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:new-terminal', () => {
    newTerminal(ink)
  }))
}

function newTerminal (ink, open = true) {
  let term = ink.InkTerminal.fromId(`terminal${Math.floor(Math.random()*10000000)}`)
  term.attach(shellPty())

  term.onDeserialize = (t) => {
    console.log('deserializing')
    t.attach(shellPty())
  }

  if (open) term.open().then(() => term.show())
  return term
}

function shellPty () {
  return pty.fork(atom.config.get("julia-client.terminal"), [], {
      cols: 100,
      rows: 30
    })
}

export function deactivate () {
  if (subs) subs.dispose()
}
