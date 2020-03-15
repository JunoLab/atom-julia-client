'use babel'

import {TextEditor, CompositeDisposable} from 'atom'

let lastEditor
let lastTerminal
let subs

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
    const item = this.history.pop()
    if (item && item.open) {
      const activeItem = atom.workspace.getActivePaneItem()
      if (activeItem instanceof TextEditor) {
        const file = activeItem.getPath() || 'untitled-' + activeItem.buffer.getId()
        const line = activeItem.getCursorBufferPosition().row
        this.openedItem = {file, line}
      }
      item.open()
    }
  }
}

export function activate (ink) {
  subs = new CompositeDisposable()

  subs.add(
    atom.workspace.onDidStopChangingActivePaneItem(item => {
      if (item instanceof TextEditor) {
        lastEditor = item
      } else if (item instanceof ink.InkTerminal) {
        lastTerminal = item
      }
    }),
    atom.packages.onDidActivateInitialPackages(() => {
      lastEditor = atom.workspace.getActiveTextEditor()
      atom.workspace.getPanes().forEach(pane => {
        const item = pane.getActiveItem()
        if (item instanceof ink.InkTerminal) {
          lastTerminal = item
        }
      })
    })
  )

  const history = new FocusHistory(30)
  ink.Opener.onDidOpen(({newLocation, oldLocation}) => {
    if (oldLocation) history.push(oldLocation)
  })

  subs.add(atom.commands.add('atom-workspace', {
    'julia-client:focus-last-editor': () => focusLastEditor(),
    'julia-client:focus-last-terminal': () => focusLastTerminal(),
    'julia-client:return-from-goto': () => history.moveBack()
  }))
}

export function deactivate () {
  lastEditor = null
  lastTerminal = null
  subs.dispose()
  subs = null
}

function focusLastEditor () {
  const pane = atom.workspace.paneForItem(lastEditor)
  if (pane) {
    pane.activate()
    pane.activateItem(lastEditor)
  }
}

function focusLastTerminal () {
  if (lastTerminal && lastTerminal.open) lastTerminal.open()
}
