/** @babel */

import { client } from '../connection'
import modules from './modules'
import { words, scopes } from '../misc'

const methods = client.import('methods')
const { getWord, isValidWord, wordRegex } = words
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
  const scps = editor
    .scopeDescriptorForBufferPosition(bufferPosition)
    .getScopesArray();
  return !scopes.isStringOrCommentScope(scps)
}

export function gotoSymbol () {
  if (!isClientAndInkIsReady()) return

  const editor = atom.workspace.getActiveTextEditor()
  const { word } = getWord(editor)
  if (!isValidWord(word)) return

  const bufferPosition = editor.getCursorBufferPosition()
  if (!isValidScope(editor, bufferPosition)) return

  // Use current module of the `editor`
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

      const { main, sub } = await modules.getEditorModule(textEditor, bufferPosition)
      const module = main ? (sub ? `${main}.${sub}` : main) : 'Main'

      return new Promise((resolve, reject) => {
        methods({ word: text, mod: module }).then(symbols => {
          // If the `methods` call fails or there is no where to go to, do nothing
          if (symbols.error || symbols.items.length === 0) {
            reject(null)
          }
          resolve({
            range: range,
            callback: () => {
              // @FIXME?: Without this kind of delay to call, this callback function won't work when
              //          there are multiple choices to go. Obviously this is very horrible hack and
              //          better to be fixed with some async technique if possible.
              setTimeout(() => {
                ink.goto.goto(symbols)
              }, 1)
            }
          })
        })
      })
    }
  }
}
