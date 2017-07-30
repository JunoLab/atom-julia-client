'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'

let { searchdocs, regenerateCache } = client.import({rpc: ['searchdocs'], msg: ['regenerateCache']})

let ink, pane

export function activate(_ink) {
  ink = _ink

  pane = ink.DocPane.fromId('Documentation')
  pane.setItems([])

  pane.process = (item) => {
    item.html = ink.KaTeX.texify(item.html)
    item.onClickName = () => {
      client.import("methods")({word: item.name, mod: item.mod}).then((symbols) =>
        ink.goto.goto(symbols))
    }
    return item
  }

  pane.search = (text, mod, exportedOnly, allPackages) => {
    client.boot()
    return searchdocs({query: text, mod, exportedOnly, allPackages})
  }

  subs = new CompositeDisposable()

  subs.add(atom.commands.add('atom-workspace', 'julia-client:show-docpane', () => {
    pane.open()
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:regenerate-doc-cache', () => {
    regenerateCache()
  }))
}
