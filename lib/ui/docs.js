'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'

let {searchdocs} = client.import({rpc: ['searchdocs']})

let ink, pane

export function activate(_ink) {
  ink = _ink

  pane = ink.DocPane.fromId('Documentation')

  subs = new CompositeDisposable()

  subs.add(atom.commands.add('atom-workspace', 'julia-client:show-docpane', () => {
    pane.open()
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:search-docs', () => {
    pane.open()
    let res = searchdocs({query: "sin"})
    res.then((res) => {
      console.log(res.items)
      pane.setItems(res.items)
    })
  }))
}
