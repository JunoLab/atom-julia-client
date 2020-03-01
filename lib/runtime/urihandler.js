/** @babel */

import { client } from '../connection'
import { docpane, views } from '../ui'

const docs = client.import('docs')
const {
  gotosymbol: gotoSymbol,
  moduleinfo: moduleInfo
} = client.import({ rpc: [ 'gotosymbol', 'moduleinfo' ] })

class URIHandler {
  activate(ink) {
    this.ink = ink
  }

  handleURI (parsedURI) {
    const { query } = parsedURI

    if (query.open) { // open a file
      atom.workspace.open(query.file, {
        initialLine: Number(query.line),
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    } else if (query.docs) { // show docs
      const { word, mod } = query
      docs({ word, mod }).then(result => {
        if (result.error) return
        const view = views.render(result)
        docpane.processLinks(view.getElementsByTagName('a'))
        docpane.ensureVisible()
        docpane.showDocument(view, [])
      })
    } else if (query.goto) {
      const { word, mod } = query
      gotoSymbol({
        word,
        mod
      }).then(symbols => {
        if (symbols.error) return
        this.ink.goto.goto(symbols, {
          pending: atom.config.get('core.allowPendingPaneItems')
        })
      })
    } else if (query.moduleinfo){ // show module info
      const { mod } = query
      moduleInfo({ mod }).then(({ doc, items }) => {
        items.map(item => {
          docpane.processItem(item)
        })
        const view = views.render(doc)
        docpane.ensureVisible()
        docpane.showDocument(view, items)
      })
    }
  }
}

export default new URIHandler()
