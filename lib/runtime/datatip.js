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
import { getWord, isValidWordToInspect } from '../misc/words'

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

    // Check the validity of code to be inspected
    const { range, word } = getWord(editor, bufferPosition)
    if (!isValidWordToInspect(word)) return

    const { main, sub } = await modules.getEditorModule(editor, bufferPosition)
    const module = main ? (sub ? `${main}.${sub}` : main) : 'Main'

    const { row, column } = bufferPosition

    try {
      const result = await datatip({
        word,
        mod: module,
        path: editor.getPath(),
        row: row + 1,
        column: column + 1
      })
      if (result.error) return
      if (this.useAtomIDEUI) {
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
      } else {
        // @NOTE: Currently atom-ide-datatip can't render multiple `snippet`s in `markedStrings` correctly
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
    } catch (error) {
      return
    }
  }
}

export default new DatatipProvider()
