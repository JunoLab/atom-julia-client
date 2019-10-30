/** @babel */

import { Point, Range } from 'atom'

export const wordRegex = /[\u00A0-\uFFFF\w_!´\.]*@?[\u00A0-\uFFFF\w_!´]+/
export const wordRegexWithoutDotAccessor = /@?[\u00A0-\uFFFF\w_!´]+/

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
 * Gets the word and its range in the `editor`
 *
 * `options`
 * - `bufferPosition` {Point}: If given returns the word at the `bufferPosition`, returns the word at the current cursor otherwise.
 * - `wordRegex` {RegExp} : A RegExp indicating what constitutes a “word”. Will be used if not both `beginWordRegex and `endWordRegex` are passed. (default: `wordRegex`).
 * - `beginWordRegex` {RegExp} : A RegExp to find a beginning of a “word”. Should be passed with `endWordRegex`. (default: `undefined`).
 * - `endWordRegex` {RegExp} : A RegExp to find an end of a “word”. Should be passed with `beginWordRegex`. (default: `undefined`).
 */
export function getWordAndRange (editor, options = {
  bufferPosition: undefined,
  wordRegex: wordRegex,
  beginWordRegex: undefined,
  endWordRegex: undefined
}) {
  // @TODO?:
  // The following lines are kinda iffy: The regex may or may not be well chosen
  // and it duplicates the efforts from atom-language-julia.
  // It might be better to select the current word via finding the smallest <span>
  // containing the bufferPosition/cursor which also has `function` or `macro` as its class.
  const range = options.bufferPosition ?
    getWordRangeAtBufferPosition(editor, options.bufferPosition, options) :
    getWordRangeAtBufferPosition(editor, editor.getLastCursor().getBufferPosition(), options)
  const word = editor.getTextInBufferRange(range)
  return { word, range }
}

/**
 * get the word under `bufferPosition` in `editor`
 *
 * `options`
 * - `wordRegex` {RegExp}: A RegExp indicating what constitutes a “word”. Will be used if not both `beginWordRegex and `endWordRegex` are passed. (default: `wordRegex`).
 * - `beginWordRegex` {RegExp} : A RegExp to find a beginning of a “word”. Should be passed with `endWordRegex`. (default: `undefined`).
 * - `endWordRegex` {RegExp} : A RegExp to find an end of a “word”. Should be passed with `beginWordRegex`. (default: `undefined`).
 */
export function getWordRangeAtBufferPosition(editor, bufferPosition, options = {
  wordRegex: wordRegex,
  beginWordRegex: undefined,
  endWordRegex: undefined,
}) {
  if (options.beginWordRegex && options.endWordRegex) {
    // adapted from https://github.com/atom/atom/blob/1.42-releases/src/cursor.js#L572-L593
    const beginRange = new Range(new Point(bufferPosition.row, 0), bufferPosition)
    const beginRanges = editor.getBuffer().findAllInRangeSync(
      options.beginWordRegex,
      beginRange
    )
    let beginPosition
    for (const range of beginRanges) {
      if (bufferPosition.isLessThanOrEqual(range.start)) break
      if (bufferPosition.isLessThanOrEqual(range.end)) {
        beginPosition = Point.fromObject(range.start)
      }
    }
    beginPosition = beginPosition || bufferPosition

    // https://github.com/atom/atom/blob/1.42-releases/src/cursor.js#L605-L624
    const endRange = new Range(bufferPosition, new Point(bufferPosition.row, Infinity));
    const endRanges = editor.getBuffer().findAllInRangeSync(
      options.endWordRegex,
      endRange
    )
    let endPosition
    for (const range of endRanges) {
      if (bufferPosition.isLessThan(range.start)) break
      if (bufferPosition.isLessThan(range.end)) {
        endPosition = Point.fromObject(range.end)
      }
    }
    endPosition = endPosition || bufferPosition

    return new Range(beginPosition, endPosition)
  } else {
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
}

/**
 * Returns `true` if `word` is valid word to be inspected.
 */
export function isValidWordToInspect (word) {
  return word.length > 0 && isNaN(word)
}
