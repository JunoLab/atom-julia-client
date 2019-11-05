/** @babel */

/**
 * @FIXME?
 * Use `component` property instaed of `markedStrings` and reuse exisiting our full-featured
 * components in ../ui/views.coffee.
 * Code in https://github.com/TypeStrong/atom-typescript/blob/master/dist/main/atom-ide/datatipProvider.js
 * can be helpful.
 */

import { client } from '../connection'
import modules from './modules'
import { isValidScopeToInspect } from '../misc/scopes'
import {
  getWordAndRange,
  getWordRangeWithoutTrailingDots,
  isValidWordToInspect
} from '../misc/words'
import { getLocalContext } from '../misc/blocks'

const datatip = client.import('datatip')

const grammar = atom.grammars.grammarForScopeName('source.julia')

class DatatipProvider {
  providerName = 'julia-client-datatip-provider'

  priority = 100

  grammarScopes = atom.config.get('julia-client.juliaSyntaxScopes')

  useAtomIDEUI = false

  async datatip(editor, bufferPosition) {
    // If Julia is not running, do nothing
    if (!client.isActive()) return

    // If the scope at `bufferPosition` is not valid code scope, do nothing
    if (!isValidScopeToInspect(editor, bufferPosition)) return

    // get word without trailing dot accessors at the buffer position
    let { range, word } = getWordAndRange(editor, {
      bufferPosition
    })
    range = getWordRangeWithoutTrailingDots(word, range, bufferPosition)
    word = editor.getTextInBufferRange(range)

    // check the validity of code to be inspected
    if (!(isValidWordToInspect(word))) return

    const { main, sub } = await modules.getEditorModule(editor, bufferPosition)
    const mod = main ? (sub ? `${main}.${sub}` : main) : 'Main'

    const { column, row } = bufferPosition
    const { context, startRow } = getLocalContext(editor, row)

    try {
      const result = await datatip({
        word,
        mod,
        path: editor.getPath(),
        column: column + 1,
        row: row + 1,
        startRow,
        context
      })
      if (result.error) return
      if (this.useAtomIDEUI) {
        if (result.line) {
          const value = editor.lineTextForBufferRow(result.line).trim()
          return {
            range,
            markedStrings: [{
              type: 'snippet',
              value,
              grammar
            }]
          }
        } else if (result.strings) {
          return {
            range,
            markedStrings: result.strings.map(string => {
              return {
                type: string.type,
                value: string.value,
                grammar: string.type === 'snippet' ? grammar : null
              }
            })
          }
        }
      } else {
        if (result.line) {
          const value = editor.lineTextForBufferRow(result.line).trim()
          return {
            range,
            markedStrings: [{
              type: 'snippet',
              value,
              grammar
            }]
          }
        } else if (result.strings) {
          // @NOTE: atom-ide-datatip can't render multiple `snippet`s in `markedStrings` correctly
          return {
            range,
            markedStrings: result.strings.map(string => {
              return {
                type: 'markdown',
                value: string.type === 'snippet' ? `\`\`\`julia\n${string.value}\n\`\`\`` : string.value,
                grammar: string.type === 'snippet' ? grammar : null
              }
            })
          }
        }
      }
    } catch (error) {
      return
    }
  }
}

export default new DatatipProvider()
