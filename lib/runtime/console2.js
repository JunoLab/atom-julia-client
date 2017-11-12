'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'

export function activate (ink) {
  pane = ink.InkTerminal.fromId('xterm')
  pane.getTitle = function () {return 'Console'}
  subs = new CompositeDisposable()

  subs.add(atom.commands.add('atom-workspace', 'julia-client:open-xterm-console', () => {
    pane._open()
    pane.show()
  }))
  subs.add(atom.commands.add('atom-workspace', 'julia-client:close-xterm-console', () => {
    pane.close()
  }))
}

export function deactivate () {
  subs.dispose()
}
