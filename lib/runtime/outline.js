'use babel'

import { CompositeDisposable } from 'atom'
import { client } from '../connection'

const outline = client.import('outline')

let pane, subs

export function activate (ink) {
  pane = ink.Outline.fromId('Julia-Outline')
  subs = new CompositeDisposable()

  subs.add(atom.config.observe('julia-client.uiOptions.layouts.outline.defaultLocation', (defaultLocation) => {
    pane.getDefaultLocation = () => { return defaultLocation }
  }))
  subs.add(client.onDetached(() => pane.setItems([])))

  let edSubs = new CompositeDisposable()
  subs.add(atom.workspace.onDidChangeActiveTextEditor(ed => {
    if (ed) {
      edSubs.dispose()

      if (ed.getGrammar().id === 'source.julia') {
        edSubs = new CompositeDisposable()

        edSubs.add(ed.onDidDestroy(() => {
          edSubs.dispose()
          pane.setItems([])
        }))

        let outline = []

        edSubs.add(ed.onDidStopChanging(() => {
          getOutline(ed.getText()).then(outlineItems => {
            outline = handleOutline(ed, edSubs, outlineItems)
          })
        }))

        edSubs.add(ed.onDidChangeCursorPosition(({newBufferPosition}) => {
          const newLine = newBufferPosition.row + 1

          outline = outline.map(item => {
            item.isActive = item.lines[0] <= newLine && newLine <= item.lines[item.lines.length - 1]
            return item
          })

          pane.setItems(outline)
        }))

        getOutline(ed.getText()).then(outlineItems => {
          outline = handleOutline(ed, edSubs, outlineItems)
        })
      } else {
        pane.setItems([])
      }
    }
  }))
}

function getOutline (text) {
  if (client.isActive()) {
    return outline(text)
  } else {
    return new Promise((resolve) => resolve([]))
  }
}

function handleOutline (ed, subs, items) {
  const cursorLine = ed.getCursorBufferPosition().row + 1

  items = items.map(item => {
    item.isActive = item.lines[0] <= cursorLine && cursorLine <= item.lines[item.lines.length - 1]
    item.onClick = () => {
      for (const pane of atom.workspace.getPanes()) {
        if (pane.getItems().includes(ed)) {
          pane.activate()
          pane.setActiveItem(ed)
          ed.setCursorBufferPosition([item.lines[0] - 1, 0])
          ed.scrollToCursorPosition()
          break
        }
      }
    }
    return item
  })

  pane.setItems(items)
  return items
}

export function open () {
  return pane.open({
    split: atom.config.get('julia-client.uiOptions.layouts.outline.split')
  })
}

export function close () {
  return pane.close()
}

export function deactivate () {
  subs.dispose()
}
