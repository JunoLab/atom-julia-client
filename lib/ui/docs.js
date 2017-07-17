'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'

let {searchdocs} = client.import({rpc: ['searchdocs']})

let ink, pane

export function activate(_ink) {
  ink = _ink

  pane = ink.DocPane.fromId('Documentation')
  pane.setItems([])

  pane.search = (text) => {
    console.log(text)
    searchdocs({query: text}).then((res) => pane.setItems(res.items))
  }

  subs = new CompositeDisposable()

  subs.add(atom.commands.add('atom-workspace', 'julia-client:show-docpane', () => {
    pane.open()
  }))
}
