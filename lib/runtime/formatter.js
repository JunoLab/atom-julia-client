/** @babel */

import { client } from '../connection'

const { format } = client.import(['format'])


// @TODO: Once DocumentFormat.jl comes to be able to handle options to specify indents,
//        we can extract some information from the status-bar tile consumed by atom-indent-detective,
//        or more safely, make atom-indent-detective provide the service and use it here ?

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
    // indent: INDENT // @TODO
  }).then(({ formattedtext }) => {
    editor.setText(formattedtext)
  })
}

function formatSelection(editor, selection) {
  const range = selection.getBufferRange()
  format({
    text: selection.getText(),
    // indent: INDENT // @TODO
  }).then(({ formattedtext }) => {
    editor.setTextInBufferRange(range, formattedtext)
  })
}
