'use babel'

import {TextEditor} from 'atom'

let lastEditor
let lastTerminal
let listener
let commands

export function activate (ink) {
  listener = atom.workspace.onDidStopChangingActivePaneItem((item) => {
    if (item instanceof TextEditor) {
      lastEditor = item
    } else if (item instanceof ink.InkTerminal) {
      lastTerminal = item
    }
  })

  commands = atom.commands.add('atom-workspace', {
    'julia-client:focus-last-editor': () => focusLastEditor(),
    'julia-client:focus-last-terminal': () => focusLastTerminal(),
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
