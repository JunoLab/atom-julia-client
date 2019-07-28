/** @babel */

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

  async datatip(editor, bufferPosition, _mouseEvent) {
    // If Julia is not running, do nothing
    if (!client.isActive()) return

    // If the scope at `bufferPosition` is not valid code scope, do nothing
    if (!isValidScopeToInspect(editor, bufferPosition)) return

    // Check the validity of code to be inspected
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
