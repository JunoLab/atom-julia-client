'use babel'

import { CompositeDisposable } from 'atom'
import { client } from '../connection'
const views = require('./views')
import goto from '../runtime/goto'

const {
  searchdocs: searchDocs,
  gotosymbol: gotoSymbol,
  moduleinfo: moduleInfo,
  regeneratedocs: regenerateDocs
} = client.import({rpc: ['searchdocs', 'gotosymbol', 'moduleinfo'], msg: ['regeneratedocs']})

let ink, subs, pane

export function activate(_ink) {
  ink = _ink

  pane = ink.DocPane.fromId('Documentation')

  pane.search = (text, mod, exportedOnly, allPackages, nameOnly) => {
    client.boot()
    return new Promise((resolve) => {
      searchDocs({query: text, mod, exportedOnly, allPackages, nameOnly}).then((res) => {
        if (!res.error) {
          for (let i = 0; i < res.items.length; i += 1) {
            res.items[i].score = res.scores[i]
            res.items[i] = processItem(res.items[i])
          }
          // erase module input if the actual searched module has been changed
          if (res.shoulderase) {
            pane.modEd.setText('')
          }
        }
        resolve(res)
      })
    })
  }

  pane.regenerateCache = () => {
    regenerateDocs()
  }

  subs = new CompositeDisposable()
  subs.add(atom.commands.add('atom-workspace', 'julia-client:open-documentation-browser', open))
  subs.add(atom.commands.add('atom-workspace', 'julia-client:regenerate-doc-cache', () => {
    regenerateDocs()
  }))
  subs.add(atom.config.observe('julia-client.uiOptions.layouts.documentation.defaultLocation', (defaultLocation) => {
    pane.setDefaultLocation(defaultLocation)
  }))
}

export function open () {
  return pane.open({
    split: atom.config.get('julia-client.uiOptions.layouts.documentation.split')
  })
}
export function ensureVisible () {
  return pane.ensureVisible({
    split: atom.config.get('julia-client.uiOptions.layouts.documentation.split')
  })
}
export function close () {
  return pane.close()
}

export function processItem (item) {
  item.html = views.render(item.html)

  processLinks(item.html.getElementsByTagName('a'))

  item.onClickName = () => {
    gotoSymbol({
      word: item.name,
      mod: item.mod
    }).then(results => {
      if (results.error) return
      return goto.selectItemsAndGo(results.items)
    })
  }

  item.onClickModule = () => {
    moduleInfo({mod: item.mod}).then(({doc, items}) => {
      items.map((x) => processItem(x))
      showDocument(views.render(doc), items)
    })
  }

  return item
}

export function processLinks (links) {
  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (link.attributes['href'].value == '@ref') {
      links[i].onclick = () => pane.kwsearch(link.innerText)
    }
  }
}

export function showDocument (view, items) {
  pane.showDocument(view, items)
}

export function deactivate () {
  subs.dispose()
}
