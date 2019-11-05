/** @babel */

import { Point, Range } from 'atom'

export const wordRegex = /[\u00A0-\uFFFF\w_!´\.]*@?[\u00A0-\uFFFF\w_!´]+/

/**
 * Takes an `editor` and gets the word at current cursor position. If that is nonempty, call
 * function `fn` with arguments `word` and `range`.
 */
export function withWord (editor, fn) {
  const { word, range } = getWordAndRange(editor)
  // If we only find numbers or nothing, return prematurely
  if (!isValidWordToInspect(word)) return
  fn(word, range)
}

/**
 * Returns the word and its range in the `editor`.
 *
 * `options`
 * - `bufferPosition` {Point}: If given returns the word at the `bufferPosition`, returns the word at the current cursor otherwise.
 * - `wordRegex` {RegExp} : A RegExp indicating what constitutes a “word” (default: `wordRegex`).
 */
export function getWordAndRange (editor, options = {
  bufferPosition: undefined,
  wordRegex: wordRegex
}) {
  // @TODO?:
  // The following lines are kinda iffy: The regex may or may not be well chosen
  // and it duplicates the efforts from atom-language-julia.
  // It might be better to select the current word via finding the smallest <span>
  // containing the bufferPosition/cursor which also has `function` or `macro` as its class.
  const bufferPosition = options.bufferPosition ?
    options.bufferPosition :
    editor.getLastCursor().getBufferPosition()
  const range = getWordRangeAtBufferPosition(editor, bufferPosition, {
    wordRegex: options.wordRegex ? options.wordRegex : wordRegex
  })
  const word = editor.getTextInBufferRange(range)
  return { word, range }
}

/**
 * Returns the range of a word containing the `bufferPosition` in `editor`.
 *
 * `options`
 * - `wordRegex` {RegExp}: A RegExp indicating what constitutes a “word” (default: `wordRegex`).
 */
export function getWordRangeAtBufferPosition (editor, bufferPosition, options = {
  wordRegex: wordRegex
}) {
  // adapted from https://github.com/atom/atom/blob/v1.38.2/src/cursor.js#L606-L616
  const { row, column } = bufferPosition
  const ranges = editor.getBuffer().findAllInRangeSync(
    options.wordRegex ? options.wordRegex : wordRegex,
    new Range(new Point(row, 0), new Point(row, Infinity))
  )
  const range = ranges.find(range =>
    range.end.column >= column && range.start.column <= column
  )
  return range ? Range.fromObject(range) : new Range(bufferPosition, bufferPosition)
}

/**
 * Examples: `|` represents `bufferPosition`:
 * - `"he|ad.word.foot"` => `Range` of `"head"`
 * - `"head|.word.foot"` => `Range` of `"head"`
 * - `"head.|word.foot"` => `Range` of `"head.word"`
 * - `"head.word.fo|ot"` => `Range` of `"head.word.field"`
 */
export function getWordRangeWithoutTrailingDots (word, range, bufferPosition) {
  const { start } = range
  const { column: startColumn } = start
  const { row: endRow } = range.end
  let endColumn = startColumn

  const { column } = bufferPosition

  const elements = word.split('.')
  for (const element of elements) {
    endColumn += element.length
    if (column <= endColumn) {
      break
    } else {
      endColumn += 1
    }
  }

  const end = new Point(endRow, endColumn)
  return new Range(start, end)
}

/**
 * Returns `true` if `word` is valid word to be inspected.
 */
export function isValidWordToInspect (word) {
  return word.length > 0 && isNaN(word)
}
