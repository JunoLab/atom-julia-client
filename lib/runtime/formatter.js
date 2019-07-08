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
      formatSelection(editor, selection)
    })
  }
}

function formatEditor (editor) {
  format({
    text: editor.getText(),
    // @NOTE: When DocumentFormat.jl comes to handle tabs as well as space-indents,
    //        branching via `getSoftTabs` API could be useful here.
    indent: editor.getTabLength()
  }).then(({ formattedtext }) => {
    editor.setText(formattedtext)
  })
}

function formatSelection(editor, selection) {
  const range = selection.getBufferRange()
  format({
    text: selection.getText(),
    // @NOTE: Refer to above
    indent: editor.getTabLength()
  }).then(({ formattedtext }) => {
    editor.setTextInBufferRange(range, formattedtext)
  })
}
