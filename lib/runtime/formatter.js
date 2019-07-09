/** @babel */

import { client } from '../connection'

const { format } = client.import(['format'])

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
  formatEditorTextInRange (editor, range, selection.getText())
}

function formatEditorTextInRange (editor, range, text) {
  const marker = markRange(editor, range)
  format({
    text: text,
    // @NOTE: When DocumentFormat.jl comes to handle tabs as well as space-indents,
    //        branching via `getSoftTabs` API could be useful here.
    indent: editor.getTabLength()
  }).then(({ formattedtext }) => {
    if (marker.isValid()) {
      editor.setTextInBufferRange(range, formattedtext)
    } else {
      atom.notifications.addError('Julia-Client: Format-Code', {
        detail: 'Cancelled the formatting task since the code has been manually modified while formatting.',
      })
    }
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
