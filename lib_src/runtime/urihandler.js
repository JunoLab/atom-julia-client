"use babel"

import { client } from '../connection'
import { docpane, views } from '../ui'

const { moduleinfo } = client.import({ rpc: ['moduleinfo'] })
const docs = client.import('docs')

export default function handleURI (parsedURI) {
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
    }).catch(err => {
      console.log(err)
    })
  } else if (query.moduleinfo){ // show module info
    const { mod } = query
    moduleinfo({ mod }).then(({ doc, items }) => {
      items.map(item => {
        docpane.processItem(item)
      })
      const view = views.render(doc)
      docpane.ensureVisible()
      docpane.showDocument(view, items)
    }).catch(err => {
      console.log(err)
    })
  }
}
