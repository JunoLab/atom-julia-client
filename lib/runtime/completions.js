/** @babel */

/**
 * @TODO: Custom sorting?
 * @TODO: Complete quotes for strings
 */

import { CompositeDisposable, Point, Range } from 'atom'

import { client } from '../connection'
import modules from './modules'

import { getLocalContext } from '../misc/blocks'

const bracketScope = 'meta.bracket.julia'
const baselineCompletionAdapter = client.import('completions')
const completionDetail = client.import('completiondetail')

class AutoCompleteProvider {
  selector = '.source.julia'
  disableForSelector = `.source.julia .comment`
  excludeLowerPriority = true
  inclusionPriority = 1
  suggestionPriority = atom.config.get('julia-client.juliaOptions.autoCompletionSuggestionPriority')
  filterSuggestions = false

  activate () {
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.config.observe('julia-client.juliaOptions.fuzzyCompletionMode', v => {
        this.fuzzyCompletionMode = v
      }),
      atom.config.observe('julia-client.juliaOptions.noAutoParenthesis', v => {
        this.noAutoParenthesis = v
      })
    )
  }

  deactivate () {
    this.subscriptions.dispose()
  }

  getSuggestions (data) {
    if (!client.isActive()) return []
    const { editor, bufferPosition, activatedManually } = data
    const { row, column } = bufferPosition
    const startPoint = new Point(row, 0)
    const endPoint = new Point(row, column)
    const lineRange = new Range(startPoint, endPoint)
    const line = editor.getTextInBufferRange(lineRange)

    // suppress completions if an whitespace precedes, except the special cases below
    // - activatedManually (i.e. an user forces completions)
    // - the current position is in function call: show method completions
    // - after `using`/`import` keyword: show package completions
    if (!activatedManually) {
      if (column === 0) return []
      const prevCharPosition = new Point(row, column - 1)
      const charRange = new Range(prevCharPosition, bufferPosition)
      const char = editor.getTextInBufferRange(charRange)
      const { scopes } = editor.scopeDescriptorForBufferPosition(bufferPosition)
      if (
        !scopes.includes(bracketScope) &&
        !(/\b(import|using)\b/.test(line)) &&
        char === ' '
      ) return []
    }

    const baselineCompletions = this.baselineCompletions(data, line)
    return Promise.race([baselineCompletions, this.sleep()])
  }

  baselineCompletions (data, line) {
    const { editor, bufferPosition: { row, column }, activatedManually } = data
    const { context, startRow } = getLocalContext(editor, row)
    return baselineCompletionAdapter({
      // general
      line,
      path: editor.getPath(),
      mod: modules.current(),
      // local context
      context,
      row: row + 1,
      startRow,
      column: column + 1,
      // configurations
      is_fuzzy: this.fuzzyCompletionMode,
      force: activatedManually || false,
    }).then(completions => {
      return completions.map(completion => {
        return this.toCompletion(completion)
      })
    }).catch(() => {
      return []
    })
  }

  toCompletion (completion) {
    const icon = this.makeIcon(completion.icon)
    if (icon) completion.iconHTML = icon
    // workaround https://github.com/atom/autocomplete-plus/issues/868
    if (!completion.description && completion.descriptionMoreURL) {
      completion.description = ' '
    }
    return completion
  }

  // should sync with atom-ink/lib/workspace/workspace.js
  makeIcon(icon) {
    // if not specified, just fallback to `completion.type`
    if (!icon) return ''
    if (icon.startsWith('icon-')) return `<span class="${icon}"}></span>`
    return icon.length === 1 ? icon : ''
  }

  sleep () {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(null)
      }, 1000)
    })
  }

  getSuggestionDetailsOnSelect (_completion) {
    const completionWithDetail = completionDetail(_completion).then(completion => {
      // workaround https://github.com/atom/autocomplete-plus/issues/868
      if (!completion.description && completion.descriptionMoreURL) {
        completion.description = ' '
      }
      return completion
    }).catch(err => {
      console.log(err)
    })
    return Promise.race([completionWithDetail, this.sleep()])
  }

  onDidInsertSuggestion ({ editor, suggestion: { type } }) {
    if (type !== 'function' || this.noAutoParenthesis) return
    editor.mutateSelectedText(selection => {
      if (!selection.isEmpty()) return
      const { row, column } = selection.getBufferRange().start
      const currentPoint = new Point(row, column)
      const nextPoint = new Point(row, column + 1)
      const range = new Range(currentPoint, nextPoint)
      const finishRange = new Range(nextPoint, nextPoint)
      if (editor.getTextInBufferRange(range) !== '(') {
        selection.insertText('()')
      }
      selection.setBufferRange(finishRange)
    })
  }
}

export default new AutoCompleteProvider()
