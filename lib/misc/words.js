/** @babel */

import { Point, Range } from 'atom'

export const wordRegex = /[\u00A0-\uFFFF\w_!´\.]*@?[\u00A0-\uFFFF\w_!´]+/

/**
 * Takes an `editor` and gets the word at current cursor position. If that is nonempty, call
 * function `fn` with arguments `word` and `range`.
 */
export function withWord (editor, fn) {
  const { word, range } = getWord(editor)
  // If we only find numbers or nothing, return prematurely
  if (!isValidWordToInspect(word)) return
  fn(word, range)
}

/**
 * Gets the word and its range in the `editor`
 *
 * `options` {Object} (optional)
 * - `bufferPosition` {Point}: If given returns the word at the `bufferPosition`, returns the word at the current cursor otherwise.
 */
export function getWord (editor, options = {}) {
  // @NOTE: The following lines are kinda iffy: The regex may or may not be well chosen
  //        and it duplicates the efforts from atom-language-julia. It might be better
  //        to select the current word via finding the smallest <span> containing the
  //        cursor which also has `function` or `macro` as its class.
  let range
  if (options.bufferPosition) {
    // Mimic the behaviour of `cursor.getCurrentWordBufferRange`
    // Referred to https://github.com/atom/atom/blob/v1.38.2/src/cursor.js#L606-L616
    const position = options.bufferPosition
    const { row, column } = position
    const ranges = editor.getBuffer().findAllInRangeSync(
      wordRegex,
      new Range(new Point(row, 0), new Point(row, Infinity))
    )
    const rangeObject = ranges.find(range =>
      range.end.column >= column && range.start.column <= column
    )
    range = rangeObject ? Range.fromObject(rangeObject) : new Range(position, position)
  } else {
    const cursor = editor.getLastCursor()
    range = cursor.getCurrentWordBufferRange({
      wordRegex: wordRegex
    })
  }
  const word = editor.getTextInBufferRange(range)
  return {word, range}
}

/**
 * Returns `true` if `word` is valid word to be inspected.
 */
export function isValidWordToInspect (word) {
  return word.length > 0 && isNaN(word)
}
