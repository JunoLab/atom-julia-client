/** @babel */

import { client } from '../connection'
import modules from './modules'
import { scopes, words } from '../misc'

const datatip = client.import('datatip')
const { getWord, isValidWordToInspect } = words

const grammar = atom.grammars.grammarForScopeName('source.julia')

/**
 * Returns `true` if the scope at `bufferPosition` in `editor` is valid code scope to be inspected
 */
function isValidScope (editor, bufferPosition) {
  const scps = editor
    .scopeDescriptorForBufferPosition(bufferPosition)
    .getScopesArray();
  return scopes.isValidScopeToInspect(scps)
}

class DatatipProvider {
  providerName = 'julia-client-datatip-provider'

  priority = 100

  grammarScopes = atom.config.get('julia-client.juliaSyntaxScopes')

  useAtomIDEUI = false

  async datatip(editor, bufferPosition, _mouseEvent) {
    // If Julia is not running, do nothing
    if (!client.isActive()) return

    // If the scope at `bufferPosition` is not valid code scope, do nothing
    if (!isValidScope(editor, bufferPosition)) return

    // Code to be inspected
    const { range, word } = getWord(editor, { bufferPosition })
    if (!isValidWordToInspect(word)) return

    const { main, sub } = await modules.getEditorModule(editor, bufferPosition)
    const module = main ? (sub ? `${main}.${sub}` : main) : 'Main'

    return new Promise((resolve, reject) => {
      datatip({ word: word, mod: module }).then((result) => {
        if (result.error) {
          reject(null)
        } else if (result.novariable) {
          reject(null)
        } else {
          resolve({
            range: range,
            markedStrings: result.strings.map(string => {
              return {
                // @NOTE: Currently only the datatip service provided by Atom-IDE-UI can render code snippets correctly
                type: this.useAtomIDEUI ? string.type : 'markdown',
                value: string.value,
                grammar: string.type === 'snippet' ? grammar : null
              }
            })
          })
        }
      })
    })
  }
}

export default new DatatipProvider()
