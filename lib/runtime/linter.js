'use babel'

import { CompositeDisposable } from 'atom'
import { client } from '../connection'

let subs, linter, ink

export function activate (i) {
  ink = i
  subs = new CompositeDisposable()

  linter = ink.Linter

  client.handle({
    staticLint: (warnings) => {
      linter.lintPane.ensureVisible()
      linter.setItems(warnings)
    },
    clearLint: () => {
      linter.clearItems()
    },
    showCompiled: (name, ...args) => {
      let cp = linter.CompiledPane.fromId(name)
      cp.open({split: 'right'})
      cp.showCode(name, ...args)
    }
  })

  subs.add(atom.commands.add('.workspace', {
    'julia-client:clear-linter': () => linter.clearItems()
  }))
}

export function deactivate () {
  subs.dispose()
}
