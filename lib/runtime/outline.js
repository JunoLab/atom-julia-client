'use babel'

import { CompositeDisposable } from 'atom'
import { client } from '../connection'

const getOutline = client.import('outline')

let pane, subs

export function activate (ink) {
  pane = ink.Outline.fromId('Julia-Outline')
  subs = new CompositeDisposable()

  subs.add(atom.config.observe('julia-client.uiOptions.layouts.outline.defaultLocation', (defaultLocation) => {
    pane.getDefaultLocation = () => { return defaultLocation }
  }))
  subs.add(client.onDetached(() => clear()))

  let edSubs = new CompositeDisposable()
  subs.add(atom.workspace.onDidChangeActiveTextEditor(ed => {
    if (ed) {
      edSubs.dispose()

      if (ed.getGrammar().id === 'source.julia') {
        edSubs = new CompositeDisposable()
        edSubs.add(ed.onDidDestroy(() => edSubs.dispose()))

        let outline = []

        edSubs.add(ed.onDidStopChanging(() => {
          getOutline(ed.getText()).then(outlineItems => {
            outline = handleOutline(ed, edSubs, outlineItems)
          })
        }))

        edSubs.add(ed.onDidChangeCursorPosition(({newBufferPosition}) => {
          const newLine = newBufferPosition.row + 1

          outline = outline.map(item => {
            if (item.lines[0] <= newLine && newLine <= item.lines[item.lines.length - 1]) {
              item.isActive = true
            } else {
              item.isActive = false
            }
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

function handleOutline (ed, subs, items) {
  const cursorLine = ed.getCursorBufferPosition().row + 1

  items = items.map(item => {
    if (item.lines[0] <= cursorLine && cursorLine <= item.lines[item.lines.length - 1]) {
      item.isActive = true
    } else {
      item.isActive = false
    }
    item.onClick = () => {
      ed.setCursorBufferPosition([item.lines[0] - 1, 0])
    }
    return item
  })

  pane.setItems(items)
  return items
}

export function open () {
  pane.open({
    split: atom.config.get('julia-client.uiOptions.layouts.outline.split')
  })
}

export function close () {
  pane.close()
}

export function deactivate () {
  subs.dispose()
}
