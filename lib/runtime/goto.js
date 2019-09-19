/** @babel */

import path from 'path'

import { client } from '../connection'
import modules from './modules'
import { isValidScopeToInspect } from '../misc/scopes'
import { getWord, getWordRangeAtBufferPosition, isValidWordToInspect } from '../misc/words'

const methods = client.import('methods')

const includeRegex = /(include|include_dependency)\(".+\.jl"\)/
const filePathRegex = /".+\.jl"/

class Goto {
  activate (ink) {
    this.ink = ink
  }

  getJumpFilePath(editor, bufferPosition) {
    const includeRange = getWordRangeAtBufferPosition(editor, bufferPosition, includeRegex)
    if (includeRange.isEmpty()) return false

    // return if the bufferPosition is not on the path string
    const filePathRange = getWordRangeAtBufferPosition(editor, bufferPosition, filePathRegex)
    if (filePathRange.isEmpty()) return false

    const filePathText = editor.getTextInBufferRange(filePathRange)
    const filePathBody = filePathText.replace(/"/g, '')
    const dirPath = path.dirname(editor.getPath())
    const filePath = path.join(dirPath, filePathBody)
    return { range: filePathRange, filePath }
  }

  /**
   * Returns `true` if Julia-client backend is running and ink is being consumed
   */
  isClientAndInkReady () {
    return client.isActive() && this.ink !== undefined
  }

  gotoSymbol () {
    const editor = atom.workspace.getActiveTextEditor()
    const bufferPosition = editor.getCursorBufferPosition()

    // file jumps
    const rangeFilePath = this.getJumpFilePath(editor, bufferPosition)
    if (rangeFilePath) {
      const { filePath } = rangeFilePath
      return atom.workspace.open(filePath, {
        pending: atom.config.get('core.allowPendingPaneItems'),
        searchAllPanes: true
      })
    }

    if (!this.isClientAndInkReady()) return

    const { word } = getWord(editor, bufferPosition)
    if (!isValidWordToInspect(word)) return

    // Use current module of the `editor`
    const currentModule = modules.current()
    const module = currentModule ? currentModule : 'Main'

    methods({ word: word, mod: module }).then(symbols => {
      if (symbols.error) return
      this.ink.goto.goto(symbols, {
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    })
  }

  provideHyperclick () {
    const getSuggestion = async (textEditor, bufferPosition) => {
      // file jumps -- invoked even if Julia isn't running
      const rangeFilePath = this.getJumpFilePath(textEditor, bufferPosition)
      if (rangeFilePath) {
        const { range, filePath } = rangeFilePath
        return {
          range,
          callback: () => {
            atom.workspace.open(filePath, {
              pending: atom.config.get('core.allowPendingPaneItems'),
              searchAllPanes: true
            })
          }
        }
      }

      // If Julia is not running, do nothing
      if (!this.isClientAndInkReady()) return

      const { word, range } = getWord(textEditor, bufferPosition)

      // If the scope at `bufferPosition` is not valid code scope, do nothing
      if (!isValidScopeToInspect(textEditor, bufferPosition)) return
      // Check the validity of code to be inspected
      if (!isValidWordToInspect(word)) return

      const { main, sub } = await modules.getEditorModule(textEditor, bufferPosition)
      const mod = main ? (sub ? `${main}.${sub}` : main) : 'Main'

      return new Promise((resolve, reject) => {
        methods({ word, mod }).then(symbols => {
          // If the `methods` call fails or there is no where to go to, do nothing
          if (symbols.error || symbols.items.length === 0) {
            reject(null)
          }
          resolve({
            range,
            callback: () => {
              setTimeout(() => {
                this.ink.goto.goto(symbols, {
                  pending: atom.config.get('core.allowPendingPaneItems')
                })
              }, 5)
            }
          })
        })
      })
    }

    return {
      providerName: 'julia-client-hyperclick-provider',
      priority: 100,
      grammarScopes: atom.config.get('julia-client.juliaSyntaxScopes'),
      getSuggestion
    }
  }
}

export default new Goto()
