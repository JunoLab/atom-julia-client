'use babel'

import { CompositeDisposable } from 'atom'
import { client } from '../connection'

let subs, lintPane

export function activate (ink) {
  const linter = ink.Linter
  lintPane = linter.lintPane

  client.handle({
    staticLint: (warnings) => {
      lintPane.ensureVisible({
        split: atom.config.get('julia-client.uiOptions.layouts.linter.split')
      })
      linter.setItems(warnings)
    }
  })

  subs = new CompositeDisposable()

  subs.add(atom.commands.add('.workspace', {
    'julia-client:clear-linter': () => linter.clearItems()
  }))
  subs.add(atom.config.observe('julia-client.uiOptions.layouts.linter.defaultLocation', (defaultLocation) => {
    lintPane.setDefaultLocation(defaultLocation)
  }))
}

export function open () {
  return lintPane.open({
    split: atom.config.get('julia-client.uiOptions.layouts.linter.split')
  })
}

export function close () {
  return lintPane.close()
}

export function deactivate () {
  if (subs) {
    subs.dispose()
  }
}
