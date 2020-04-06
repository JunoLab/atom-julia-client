'use babel'

import { CompositeDisposable, Disposable, TextEditor } from 'atom'
import { throttle } from 'underscore-plus'
import { client } from '../connection'
import modules from './modules'

const updateeditor = client.import('updateeditor')
let pane, subs, edSubs, outline

export function activate (ink) {
  pane = ink.Outline.fromId('Julia-Outline')
  subs = new CompositeDisposable()
  edSubs = new CompositeDisposable()
  outline = []

  subs.add(
    atom.config.observe('julia-client.uiOptions.layouts.outline.defaultLocation', defaultLocation => {
      pane.setDefaultLocation(defaultLocation)
    }),
    atom.workspace.onDidStopChangingActivePaneItem(throttle(ed => watchEditor(ed), 300)),
    atom.packages.onDidActivateInitialPackages(() => watchEditor(atom.workspace.getActivePaneItem())),
    client.onDetached(() => {
      outline = []
      pane.setItems([])
    }),
    new Disposable(() => {
      outline = []
      pane.setItems([])
      if (edSubs) edSubs.dispose()
    })
  )
}

function watchEditor (ed) {
  if (!(ed && ed instanceof TextEditor)) return

  if (edSubs) edSubs.dispose()
  edSubs = new CompositeDisposable() // we can't repeat disposing on the same `CompositeDisposable` object

  if (ed.getGrammar().id !== 'source.julia') {
    pane.setItems([])
  } else {
    edSubs.add(
      ed.onDidStopChanging(throttle(() => updateEditor(ed), 300)),
      ed.onDidChangeCursorPosition(throttle(() => updateOutline(ed), 300))
    )
    updateEditor(ed, { updateSymbols: false })
  }
  edSubs.add(
    ed.onDidDestroy(() => {
      outline = []
      pane.setItems([])
    }),
    ed.onDidChangeGrammar(grammar => {
      watchEditor(ed)
    })
  )
}

// NOTE: update outline and symbols cache all in one go
function updateEditor (ed, options = {
  updateSymbols: true
}) {
  if (!client.isActive()) return new Promise(resolve => resolve([]))

  const text = ed.getText()
  const currentModule = modules.current()
  const mod = currentModule ? currentModule : 'Main'
  const path = ed.getPath() || 'untitled-' + ed.getBuffer().getId()

  updateeditor({
    text,
    mod,
    path,
    // https://github.com/JunoLab/Juno.jl/issues/407
    updateSymbols: options.updateSymbols
  }).then(outlineItems => {
    outline = handleOutline(ed, outlineItems)
  }).catch(err => {
    console.log(err);
  })
}

function handleOutline (ed, outlineItems) {
  const cursorLine = ed.getCursorBufferPosition().row + 1

  outlineItems = outlineItems.map(outlineItem => {
    outlineItem.isActive = outlineItem.start <= cursorLine && cursorLine <= outlineItem.stop
    outlineItem.onClick = () => {
      for (const pane of atom.workspace.getPanes()) {
        if (pane.getItems().includes(ed)) {
          pane.activate()
          pane.setActiveItem(ed)
          ed.setCursorBufferPosition([outlineItem.start - 1, 0])
          ed.scrollToCursorPosition()
          break
        }
      }
    }
    return outlineItem
  })

  pane.setItems(outlineItems)
  return outlineItems
}

function updateOutline (ed) {
  const cursorLine = ed.getCursorBufferPosition().row + 1
  outline = outline.map(item => {
    item.isActive = item.start <= cursorLine && cursorLine <= item.stop
    return item
  })
  pane.setItems(outline)
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
  if (subs) subs.dispose()
}
