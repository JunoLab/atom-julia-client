/** @babel */

import { Range, Point } from 'atom'

import { client } from '../connection'
import modules from './modules'

const datatip = client.import('datatip')
// @FIXME: This does not work with non-ascii characters
const wordRegex = /[^0-9A-Za-z_!\.´@]/
const grammar = atom.grammars.grammarForScopeName('source.julia');

class DatatipProvider {
  providerName = "Julia-Client";
  grammarScopes = atom.config.get('julia-client.juliaSyntaxScopes');
  priority = 100;
  useAtomIDEUI = false;

  async datatip(editor, bufferPosition, mouseEvent) {
    // If Julia is not running, do nothing
    if (!client.isActive()) return null

    // If the scope at `bufferPosition` is not valid code scope, do nothing
    const scopes = editor
      .scopeDescriptorForBufferPosition(bufferPosition)
      .getScopesArray();
    const nonCodeScope = scopes.find(scope => {
      return scope.search("comment") > -1 || scope.search("string") > -1;
    });
    if (nonCodeScope) return null

    // Code to be inspected
    const { row, column } = bufferPosition
    const text = editor.lineTextForBufferRow(row)
    if (!text) return null
    let start = column
    const identifierStart = text.slice(0, column).split('').reverse().join('').search(wordRegex)
    if (identifierStart === -1) {
      start = 0
    } else {
      start -= identifierStart
    }
    let end = column
    const identifierEnd = text.slice(column).search(wordRegex)
    if (identifierEnd === -1) {
      end = text.length
    } else {
      end += identifierEnd
    }
    const word = text.slice(start, end)
    if (!word) return null

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
