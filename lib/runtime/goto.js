/** @babel */

import { client } from '../connection'
import modules from './modules'
import { isValidScopeToInspect } from '../misc/scopes'
import { getWord, isValidWordToInspect, wordRegex } from '../misc/words'

const methods = client.import('methods')

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

export function gotoSymbol () {
  if (!isClientAndInkIsReady()) return

  // const bufferPosition = editor.getCursorBufferPosition()
  // if (!isValidScope(editor, bufferPosition)) return

  const editor = atom.workspace.getActiveTextEditor()
  const { word } = getWord(editor)
  if (!isValidWordToInspect(word)) return

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
      // If Julia is not running, do nothing
      if (!isClientAndInkIsReady()) return

      // If the scope at `bufferPosition` is not valid code scope, do nothing
      const bufferPosition = range.start
      if (!isValidScopeToInspect(textEditor, bufferPosition)) return

      // Check the validity of code to be inspected
      if (!isValidWordToInspect(text)) return

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
              // @XXX: Without this kind of delay to call, this callback function won't work when
              //       there are multiple choices to go. Obviously this is very horrible hack and
              //       better to be fixed with some async technique if possible.
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
