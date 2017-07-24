'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'

let { searchdocs } = client.import({rpc: ['searchdocs']})

let ink, pane

export function activate(_ink) {
  ink = _ink

  pane = ink.DocPane.fromId('Documentation')
  pane.setItems([])

  pane.process = (item) => {item.html = ink.KaTeX.texify(item.html); return item}

  pane.search = (text, mod, exported) => {
    client.boot()
    return searchdocs({query: text, mod, exported})
  }

  subs = new CompositeDisposable()

  subs.add(atom.commands.add('atom-workspace', 'julia-client:show-docpane', () => {
    pane.open()
  }))
}
