/** @babel */

import path from 'path'
import fs from 'fs'
import { CompositeDisposable, Range } from 'atom'

import { client } from '../connection'
import modules from './modules'
import { isValidScopeToInspect } from '../misc/scopes'
import {
  getWordAndRange,
  getWordRangeAtBufferPosition,
  getWordRangeWithoutTrailingDots,
  isValidWordToInspect
} from '../misc/words'
import { getLocalContext } from '../misc/blocks'
import { show } from '../ui/selector'

const {
  gotosymbol: gotoSymbol,
  regeneratesymbols: regenerateSymbols,
  clearsymbols: clearSymbols,
} = client.import(['gotosymbol', 'regeneratesymbols', 'clearsymbols'])

const includeRegex = /(include|include_dependency)\(".+\.jl"\)/
const filePathRegex = /".+\.jl"/

class Goto {
  activate (ink) {
    this.ink = ink
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'julia-client:regenerate-symbols-cache', () => {
        regenerateSymbols()
      }),
      atom.commands.add('atom-workspace', 'julia-client:clear-symbols-cache', () => {
        clearSymbols()
      })
    )
  }

  deactivate () {
    this.subscriptions.dispose()
  }

  getJumpFilePath(editor, bufferPosition) {
    const includeRange = getWordRangeAtBufferPosition(editor, bufferPosition, {
      wordRegex: includeRegex
    })
    if (includeRange.isEmpty()) return false

    // return if the bufferPosition is not on the path string
    const filePathRange = getWordRangeAtBufferPosition(editor, bufferPosition, {
      wordRegex: filePathRegex
    })
    if (filePathRange.isEmpty()) return false

    const filePathText = editor.getTextInBufferRange(filePathRange)
    const filePathBody = filePathText.replace(/"/g, '')
    const dirPath = path.dirname(editor.getPath())
    const filePath = path.join(dirPath, filePathBody)

    // return if there is not such a file exists
    if (!fs.existsSync(filePath)) return false
    return { range: filePathRange, filePath }
  }

  isClientAndInkReady () {
    return client.isActive() && this.ink !== undefined
  }

  // TODO: handle remote files ?
  selectItemsAndGo (items) {
    if (items.length === 0) return
    if (items.length === 1) {
      const item = items[0]
      return this.ink.Opener.open(item.file, item.line, {
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    }
    items = items.map(result => {
      result.primary = result.text
      result.secondary = `${result.file}:${result.line}`
      return result
    })
    return show(items).then(item => {
      if (!item) return
      this.ink.Opener.open(item.file, item.line, {
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    })
  }

  gotoSymbol () {
    const editor = atom.workspace.getActiveTextEditor()
    const bufferPosition = editor.getCursorBufferPosition()

    // file jumps
    const rangeFilePath = this.getJumpFilePath(editor, bufferPosition)
    if (rangeFilePath) {
      const { filePath } = rangeFilePath
      return this.ink.Opener.open(filePath, 0, {
        pending: atom.config.get('core.allowPendingPaneItems'),
      })
    }

    if (!this.isClientAndInkReady()) return

    // get word without trailing dot accessors at the buffer position
    let { word, range } = getWordAndRange(editor, {
      bufferPosition
    })
    range = getWordRangeWithoutTrailingDots(word, range, bufferPosition)
    word = editor.getTextInBufferRange(range)

    // check the validity of code to be inspected
    if (!(isValidWordToInspect(word))) return

    // local context
    const { column, row } = bufferPosition
    const { context, startRow } = getLocalContext(editor, row)

    // module context
    const currentModule = modules.current()
    const mod = currentModule ? currentModule : 'Main'
    const text = editor.getText() // buffer text that will be used for fallback entry

    return gotoSymbol({
      word,
      path: editor.getPath() || 'untitled-' + editor.getBuffer().getId(),
      // local context
      column: column + 1,
      row: row + 1,
      startRow,
      context,
      onlyGlobal: false,
      // module context
      mod,
      text
    }).then(results => {
      if (results.error) return
      this.selectItemsAndGo(results.items)
    }).catch(err => {
      console.log(err)
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
            return this.ink.Opener.open(filePath, 0, {
              pending: atom.config.get('core.allowPendingPaneItems'),
            })
          }
        }
      }

      // If Julia is not running, do nothing
      if (!this.isClientAndInkReady()) return

      // If the scope at `bufferPosition` is not valid code scope, do nothing
      if (!isValidScopeToInspect(textEditor, bufferPosition)) return

      // get word without trailing dot accessors at the buffer position
      let { word, range } = getWordAndRange(textEditor, {
        bufferPosition
      })
      range = getWordRangeWithoutTrailingDots(word, range, bufferPosition)
      word = textEditor.getTextInBufferRange(range)

      // check the validity of code to be inspected
      if (!(isValidWordToInspect(word))) return

      // local context
      const { column, row } = bufferPosition
      const { context, startRow } = getLocalContext(textEditor, row)

      // module context
      const { main, sub } = await modules.getEditorModule(textEditor, bufferPosition)
      const mod = main ? (sub ? `${main}.${sub}` : main) : 'Main'
      const text = textEditor.getText() // buffer text that will be used for fallback entry

      return new Promise((resolve) => {
        gotoSymbol({
          word,
          path: textEditor.getPath() || 'untitled-' + textEditor.getBuffer().getId(),
          // local context
          column: column + 1,
          row: row + 1,
          startRow,
          context,
          onlyGlobal: false,
          // module context
          mod,
          text
        }).then(results => {
          // If the `goto` call fails or there is no where to go to, do nothing
          if (results.error) {
            resolve({
              range: new Range([0,0], [0,0]),
              callback: () => {}
            })
          }
          resolve({
            range,
            callback: () => setTimeout(() => this.selectItemsAndGo(results.items), 5)
          })
        }).catch(err => {
          console.log(err)
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
