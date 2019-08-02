/** @babel */

import { client } from '../connection'

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
  formatEditorTextInRange(editor, range, editor.getText())
}

function formatEditorWithSelection (editor, selection) {
  const range = selection.getBufferRange()
  formatEditorTextInRange(editor, range, selection.getText())
}

function formatEditorTextInRange (editor, range, text) {
  const marker = markRange(editor, range)
  format({
    text: text,
    // @NOTE: Branch on `getSoftTabs` if supported by formatter.
    indent: editor.getTabLength(),
    margin: editor.getPreferredLineLength()
  }).then(({ error, formattedtext }) => {
    if (error) {
      atom.notifications.addError('Julia-Client: Format-Code', {
        detail: error,
        dismissable: true
      })
    } else {
      if (marker.isValid()) {
        editor.setTextInBufferRange(marker.getBufferRange(), formattedtext)
      } else {
        atom.notifications.addError('Julia-Client: Format-Code', {
          detail: 'Cancelled the formatting task because the selected code has been manually modified.',
          dismissable: true
        })
      }
    }
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
