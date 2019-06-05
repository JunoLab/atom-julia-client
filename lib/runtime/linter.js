'use babel'

import { CompositeDisposable } from 'atom'
import { client } from '../connection'

let subs

export function activate (ink) {
  const linter = ink.Linter

  client.handle({
    staticLint: (warnings) => {
      linter.lintPane.ensureVisible({
        split: atom.config.get('julia-client.uiOptions.layouts.linter.split')
      })
      linter.setItems(warnings)
    },
    clearLint: () => {
      linter.clearItems()
    },
    showCompiled: (name, ...args) => {
      const cp = linter.CompiledPane.fromId(name)
      cp.open({split: 'right'})
      cp.showCode(name, ...args)
    }
  })

  subs = new CompositeDisposable()

  subs.add(atom.commands.add('.workspace', {
    'julia-client:clear-linter': () => linter.clearItems()
  }))
  subs.add(atom.config.observe('julia-client.uiOptions.layouts.linter.defaultLocation', (defaultLocation) => {
    linter.lintPane.setDefaultLocation(defaultLocation)
  }))
}

export function deactivate () {
  subs.dispose()
}
