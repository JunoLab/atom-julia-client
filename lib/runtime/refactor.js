'use babel'

import { client } from '../connection'
import modules from './modules'
import { getWordRangeAtBufferPosition, isValidWordToInspect } from '../misc/words'
import { getLocalContext } from '../misc/blocks'

const { refactor: _refactor } = client.import(['refactor'])
const wordRegexWithoutDotAccessor = /@?[\u00A0-\uFFFF\w_!´]+/

class Refactor {
  activate (ink) {
    this.ink = ink
  }

  refactor () {
    const editor = atom.workspace.getActiveTextEditor()
    const bufferPosition = editor.getCursorBufferPosition()

    if (!client.isActive()) return

    const range = getWordRangeAtBufferPosition(editor, bufferPosition, wordRegexWithoutDotAccessor)
    if (range.isEmpty()) return
    const old = editor.getTextInBufferRange(range)
    if (!isValidWordToInspect(old)) return

    this.ink.showBasicModal([{
      name: 'Rename',
      defaultText: old,
      message: `Enter an new name to which \`${old}\` will be renamed.`
    }]).then(items => {
      // check the new name is a valid identifier
      const _new = items['Rename']
      if (!isValidWordToInspect(_new) || _new.match(wordRegexWithoutDotAccessor) != _new) {
        atom.notifications.addWarning('Julia Client: Rename Refactor', {
          description: `\`${_new}\` is not a valid identifier`
        })
        return
      }

      // local context
      const { column, row } = bufferPosition
      const { range, context, startRow } = getLocalContext(editor, row)

      // module context
      const currentModule = modules.current()
      const mod = currentModule ? currentModule : 'Main'

      _refactor({
        old,
        new: _new,
        path: editor.getPath(),
        // local context
        column: column + 1,
        row: row + 1,
        startRow,
        context,
        // module context
        mod,
      }).then(result => {
        if (result.error) {
          atom.notifications.addWarning('Julia Client: Rename Refactor', {
            description: result.error
          })
          return
        }
        // local refactoring
        if (result.text) {
          editor.setTextInBufferRange(range, result.text)
        }
      })
    }).catch((err) => {
      if (err) console.error(err)
    })
  }
}

export default new Refactor()
