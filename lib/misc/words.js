/** @babel */

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
 * Gets the word and its range in the `editor` which the last cursor is on.
 */
export function getWord (editor) {
  const cursor = editor.getLastCursor()
  // The following line is kinda iffy: The regex may or may not be well chosen
  // and it duplicates the efforts from atom-language-julia. It might be better
  // to select the current word via finding the smallest <span> containing the
  // cursor which also has `function` or `macro` as its class.
  const range = cursor.getCurrentWordBufferRange({
    wordRegex: wordRegex
  })
  const word = editor.getTextInBufferRange(range)
  return {word, range}
}

/**
 * Returns `true` if `word` is valid word to be inspected.
 */
export function isValidWordToInspect (word) {
  return word.length > 0 && isNaN(word)
}
