'use babel'

import { CompositeDisposable } from 'atom'
import { throttle } from 'underscore-plus'
import { client } from '../connection'
import modules from './modules'

const updateeditor = client.import('updateeditor')
let pane, subs

export function activate (ink) {
  pane = ink.Outline.fromId('Julia-Outline')
  subs = new CompositeDisposable()

  subs.add(atom.config.observe('julia-client.uiOptions.layouts.outline.defaultLocation', (defaultLocation) => {
    pane.setDefaultLocation(defaultLocation)
  }))
  subs.add(client.onDetached(() => pane.setItems([])))

  let edSubs = new CompositeDisposable()
  subs.add(atom.workspace.onDidChangeActiveTextEditor(throttle(ed => {
    if (!ed) return

    edSubs.dispose()

    if (ed.getGrammar().id !== 'source.julia') {
      pane.setItems([])
      return
    }

    edSubs = new CompositeDisposable()

    edSubs.add(ed.onDidDestroy(() => {
      edSubs.dispose()
      pane.setItems([])
    }))
    edSubs.add(ed.onDidChangeGrammar((grammar) => {
      if (grammar.id !== 'source.julia') {
        edSubs.dispose()
        pane.setItems([])
      }
    }))

    let outline = []

    edSubs.add(ed.onDidStopChanging(() => {
      updateEditor(ed).then(outlineItems => {
        outline = handleOutline(ed, edSubs, outlineItems)
      }).catch(err => {
        console.log(err);
      })
    }))

    edSubs.add(ed.onDidChangeCursorPosition(throttle(() => {
      const cursorLine = ed.getCursorBufferPosition().row + 1

      outline = outline.map(item => {
        item.isActive = item.start <= cursorLine && cursorLine <= item.stop
        return item
      })

      pane.setItems(outline)
    }, 300)))

    updateEditor(ed, {
      updateSymbols: false
    }).then(outlineItems => {
      outline = handleOutline(ed, edSubs, outlineItems)
    }).catch(err => {
      console.log(err);
    })
  }, 300)))
}

// NOTE: update outline and symbols cache all in one go
function updateEditor (editor, options = {
  updateSymbols: true
}) {
  if (!client.isActive()) {
    return new Promise((resolve) => resolve([]))
  }

  const text = editor.getText()
  const currentModule = modules.current()
  const mod = currentModule ? currentModule : 'Main'
  const path = editor.getPath() || 'untitled-' + editor.getBuffer().getId()
  return updateeditor({
    text,
    mod,
    path,
    // https://github.com/JunoLab/Juno.jl/issues/407
    updateSymbols: options.updateSymbols
  })
}

function handleOutline (ed, subs, items) {
  const cursorLine = ed.getCursorBufferPosition().row + 1

  items = items.map(item => {
    item.isActive = item.start <= cursorLine && cursorLine <= item.stop
    item.onClick = () => {
      for (const pane of atom.workspace.getPanes()) {
        if (pane.getItems().includes(ed)) {
          pane.activate()
          pane.setActiveItem(ed)
          ed.setCursorBufferPosition([item.start - 1, 0])
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
