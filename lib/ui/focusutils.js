'use babel'

import {TextEditor} from 'atom'

let lastEditor
let lastTerminal
let listener
let commands
let ink

function clamp (x, min, max) {
  return Math.min(Math.max(x, min), max)
}

class FocusHistory {
  constructor (size) {
    this.size = size
    this.history = []
    this.openedItem = undefined
  }

  push (item) {
    if (this.openedItem &&
        this.openedItem.file &&
        this.openedItem.line &&
        item.file == this.openedItem.file &&
        item.line == this.openedItem.line) {
      return
    }

    this.history.push(item)
    while (this.history.length > this.size) {
      this.history.shift()
    }
    return
  }

  moveBack () {
    let item = this.history.pop()
    if (item && item.open) {
      const activeItem = atom.workspace.getActivePaneItem()
      if (activeItem instanceof TextEditor) {
        let file = activeItem.getPath() || 'untitled-' + activeItem.buffer.getId()
        let line = activeItem.getCursorBufferPosition().row
        this.openedItem = {file, line}
      }
      item.open()
    }
  }
}

export function activate (i) {
  ink = i
  let history = new FocusHistory(30)

  ink.Opener.onDidOpen(({newLocation, oldLocation}) => {
    if (oldLocation) history.push(oldLocation)
  })

  commands = atom.commands.add('atom-workspace', {
    'julia-client:focus-last-editor': () => focusLastEditor(),
    'julia-client:focus-last-terminal': () => focusLastTerminal(),
    'julia-client:return-from-goto': () => history.moveBack()
  })
}

function getPane (item) {
  for (let pane of atom.workspace.getPanes()) {
    if (pane.getItems().includes(item)) {
      return pane
    }
  }
}

export function deactivate () {
  listener.dispose()
  commands.dispose()
}

export function lastEditor () {
  return lastEditor
}

function focusLastEditor () {
  let pane = getPane(lastEditor)
  if (pane) {
    pane.activate()
    pane.activateItem(lastEditor)
  }
}

export function lastTerminal () {
  return lastTerminal
}

function focusLastTerminal () {
  if (lastTerminal && lastTerminal.open) lastTerminal.open()
}
