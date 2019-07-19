/** @babel */

import { client } from '../connection'
import modules from './modules'
import { words, scopes } from '../misc'

const methods = client.import('methods')
const { getEditorModule } = modules
const { getWord, isValidWord, wordRegex } = words
const { isStringOrCommentScope } = scopes
let ink = undefined

export function activate (i) {
  ink = i
}

/**
 * Returns `true` if Julia-client backend is running and ink is being consumed
 */
function isClientAndInkIsReady () {
  return client.isActive() && ink !== undefined
}

/**
 * Returns `true` if the scope at `bufferPosition` in `editor` is valid code scope to be inspected
 */
function isValidScope (editor, bufferPosition) {
  const scopes = editor
    .scopeDescriptorForBufferPosition(bufferPosition)
    .getScopesArray();
  return !isStringOrCommentScope(scopes)
}

export function gotoSymbol () {
  if (!isClientAndInkIsReady()) return

  const editor = atom.workspace.getActiveTextEditor()
  const { word } = getWord(editor)
  if (!isValidWord(word)) return

  const bufferPosition = editor.getCursorBufferPosition()
  if (!isValidScope(editor, bufferPosition)) return

  // Use current module of the `editor`
  // @NOTE: Not sure why, but `const { current } = modules` doesn't work here ...
  const currentModule = modules.current()
  const module = currentModule ? currentModule : 'Main'

  methods({ word: word, mod: module }).then(symbols => {
    if (symbols.error) return
    ink.goto.goto(symbols)
  })
}

export function provideHyperclick () {
  return {
    providerName: 'julia-client-hyperclick-provider',

    priority: 100,

    grammarScopes: atom.config.get('julia-client.juliaSyntaxScopes'),

    wordRegExp:  new RegExp(wordRegex, "g"),

    async getSuggestionForWord(textEditor, text, range) {
      if (!isClientAndInkIsReady()) return

      if (!isValidWord(text)) return

      const bufferPosition = range.start
      if (!isValidScope(textEditor, bufferPosition)) return

      const { main, sub } = await getEditorModule(textEditor, bufferPosition)
      const module = main ? (sub ? `${main}.${sub}` : main) : 'Main'

      return new Promise((resolve, reject) => {
        methods({ word: text, mod: module }).then(symbols => {
          if (symbols.error) {
            reject(null)
          }
          resolve({
            range: range,
            callback: () => {
              ink.ink.goto(symbols)
            }
          })
        })
      })
    }
  }
}
