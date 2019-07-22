/** @babel */

import { Range, Point } from 'atom'

import { client } from '../connection'
import modules from './modules'
import { scopes, words } from '../misc'

const datatip = client.import('datatip')
const { isValidWordToInspect } = words

const wordRegex = /[^.\u00A0-\uFFFF\w_!´\.@]/
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
  providerName = 'julia-client-datatip-provider';

  priority = 100;

  grammarScopes = atom.config.get('julia-client.juliaSyntaxScopes');

  useAtomIDEUI = false;

  async datatip(editor, bufferPosition, mouseEvent) {
    // If Julia is not running, do nothing
    if (!client.isActive()) return

    // If the scope at `bufferPosition` is not valid code scope, do nothing
    if (!isValidScope(editor, bufferPosition)) return

    // Code to be inspected
    const { row, column } = bufferPosition
    const text = editor.lineTextForBufferRow(row)
    if (!text) return null
    let start = column
    const identifierStart = text.slice(0, column).split('').reverse().join('').search(wordRegex)
    if (!identifierStart || identifierStart === -1) {
      start = 0
    } else {
      start -= identifierStart
    }
    let end = column
    const identifierEnd = text.slice(column).search(wordRegex)
    if (!identifierEnd || identifierEnd === -1) {
      end = text.length
    } else {
      end += identifierEnd
    }
    const word = text.slice(start, end)
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
            range: new Range(
              new Point(row, start),
              new Point(row, end)
            ),
            markedStrings: result.strings.map(string => {
              return {
                // @NOTE: Currently only the datatip service provided by Atom-IDE-UI can render code snippets correctly
                type: this.useAtomIDEUI ? string.type : 'markdown',
                value: string.value,
                grammar: string.type === 'snippet' ? grammar : null
              }
            }),
          });
        }
      })
    });
  }
}

export default new DatatipProvider();
