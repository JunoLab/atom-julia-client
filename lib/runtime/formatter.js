/** @babel */

import path from 'path'
import { client } from '../connection'
import { CompositeDisposable } from 'atom'

const format = client.import('format')

export function formatCode () {
  const editor = atom.workspace.getActiveTextEditor()
  if (!editor) return

  const selections = editor.getSelections()
  if (selections.length === 1 && !selections[0].getText()) {
    formatEditor(editor)
  } else {
    selections.forEach((selection) => {
      formatEditorWithSelection(editor, selection)
    })
  }
}

function formatEditor (editor) {
  const range = editor.getBuffer().getRange()
  return formatEditorTextInRange(editor, range, editor.getText())
}

function formatEditorWithSelection (editor, selection) {
  const range = selection.getBufferRange()
  return formatEditorTextInRange(editor, range, selection.getText())
}

function formatEditorTextInRange (editor, range, text) {
  const dir = path.dirname(client.editorPath(editor))
  const marker = markRange(editor, range)
  // NOTE: Branch on `getSoftTabs` if supported by formatter.
  const indent = editor.getTabLength()
  const margin = editor.getPreferredLineLength()
  format({
    text,
    dir,
    indent,
    margin,
  }).then(({ error, formattedtext }) => {
    if (error) {
      atom.notifications.addError('Julia-Client: Format-Code', {
        description: error,
        dismissable: true
      })
    } else {
      if (marker.isValid()) {
        const pos = editor.getCursorBufferPosition()
        editor.setTextInBufferRange(marker.getBufferRange(), formattedtext)
        editor.scrollToBufferPosition(pos)
        editor.setCursorBufferPosition(pos)
      } else {
        atom.notifications.addError('Julia-Client: Format-Code', {
          description: 'Cancelled the formatting task because the selected code has been manually modified.',
          dismissable: true
        })
      }
    }
  }).catch(err => {
    console.log(err)
  }).finally(() => {
    marker.destroy()
  })
}

function markRange(editor, range) {
  const marker = editor.markBufferRange(range, {
    invalidate: 'inside'
  })
  editor.decorateMarker(marker, {
    type: 'highlight',
    class: 'ink-block'
  })
  return marker
}

let subs

export function activate() {
  subs = new CompositeDisposable()
  const edWatch = new WeakSet()

  subs.add(atom.workspace.observeTextEditors(ed => {
    edWatch.add(ed)
    // use onDidSave instead of onWillSave to guarantee our formatter is the last to run:
    const edsub = ed.getBuffer().onDidSave(() => {
      if (ed && ed.getGrammar && ed.getGrammar().id === 'source.julia') {
        if (client.isActive() && edWatch.has(ed)) {
          formatEditor(ed).then(() => {
            edWatch.delete(ed)
            ed.save().then(() => {
              edWatch.add(ed)
            }).catch(err => {
              console.log(err)
            })
          }).catch(err => {
            console.log(err)
          })
        }
      }
    })
    subs.add(edsub)

    subs.add(ed.onDidDestroy(() => {
      edsub.dispose()
    }))
  }))
}

export function deactivate() {
  subs && subs.dispose && subs.dispose()
}
