/** @babel */

/**
 * @TODO: WIP: Make icons consistent with workspace and Documentation view: Needs a lot of refactors
 * @TODO: Custom sorting?
 * @TODO: Complete quotes for strings
 */

import { Point, Range } from 'atom'

import { client } from '../connection'
import modules from './modules'

const completions = client.import('completions')

class AutoCompleteProvider {
  // @NOTE: This automatically respects emebedded Julia code and thus we don't need do something like
  // ```js
  // selector = atom.config.get('julia-client.juliaSyntaxScopes').map(selector => {
  //   return `.${selector}`
  // }).join(', ')
  // ```
  selector = '.source.julia'
  disableForSelector = `.source.julia .comment`
  excludeLowerPriority = false
  inclusionPriority = 3
  suggestionPriority = atom.config.get('julia-client.juliaOptions.autoCompletionSuggestionPriority')
  filterSuggestions = false

  getSuggestions (data) {
    if (!client.isActive()) return []

    // Don't show suggestions if preceding char is a space (unless activate manually)
    if (!data.activatedManually) {
      const point = data.bufferPosition
      const { row, column } = point
      if (column === 0) return []
      const prevCharPoint = new Point(row, column - 1)
      const range = new Range(prevCharPoint, point)
      const text = data.editor.getTextInBufferRange(range)
      if (text.match(/\s/)) return []
    }

    const suggestions = this.rawCompletions(data).then(({ completions, prefix, mod }) => {
      try {
        return this.processCompletions(completions, prefix)
      } catch (err) {
        return []
      }
    })
    return Promise.race([suggestions, this.sleep()])
  }

  rawCompletions (data) {
    const { editor, bufferPosition: {row, column}, activatedManually } = data
    const startPoint = new Point(row, 0)
    const endPoint = new Point(row, column)
    const lineRange = new Range(startPoint, endPoint)
    return completions({
      path: editor.getPath(),
      mod: modules.current(),
      line: editor.getTextInBufferRange(lineRange),
      column: column + 1,
      force: activatedManually || false
    })
  }

  processCompletions (completions, prefix) {
    return completions.map((completion) => {
      return this.toCompletion(completion, prefix)
    })
  }

  toCompletion (completion, prefix) {
    if (completion.constructor instanceof String) {
      completion = {
        text: completion
      }
    }
    completion.replacementPrefix = completion._prefix ? prefix : null

    this.processIcon(completion)
    return completion
  }

  processIcon (completion) {
    const { type } = completion
    switch (type) {
      case 'function':
        completion.iconHTML = '<span class="icon-function">λ</span>'
        break
      case 'macro':
        completion.type = 'function'
        completion.iconHTML = '<span class="icon-function">@</span>'
        break
      case 'type':
        completion.iconHTML = '<span class="icon-type">T</span>'
        break
      case 'path':
        completion.leftLabel = 'Path'
        completion.rightLabel = null // Disable module
        completion.iconHTML = '<span class="icon-file-code"></span>'
        break
    }
  }

  sleepSecond = 1
  sleep () {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(null)
      }, this.sleepSecond * 1000)
    })
  }

  onDidInsertSuggestion ({ editor, suggestion: { type } }) {
    if (type !== 'function' || atom.config.get('julia-client.juliaOptions.noAutoParenthesis')) return
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
