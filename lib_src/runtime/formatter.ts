/** @babel */

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
  const marker = markRange(editor, range)
  // @NOTE: Branch on `getSoftTabs` if supported by formatter.
  let indent = atom.config.get('julia-client.juliaOptions.formattingOptions.indent')
  if (indent === -1) indent = editor.getTabLength()
  let margin = atom.config.get('julia-client.juliaOptions.formattingOptions.margin')
  if (margin === -1) margin = editor.getPreferredLineLength()
  format({
    text,
    indent,
    margin,
    always_for_in: atom.config.get('julia-client.juliaOptions.formattingOptions.always_for_in'),
    whitespace_typedefs: atom.config.get('julia-client.juliaOptions.formattingOptions.whitespace_typedefs'),
    whitespace_ops_in_indices: atom.config.get('julia-client.juliaOptions.formattingOptions.whitespace_ops_in_indices'),
    remove_extra_newlines: atom.config.get('julia-client.juliaOptions.formattingOptions.remove_extra_newlines')
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
