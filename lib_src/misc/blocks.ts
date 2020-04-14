"use babel"
// TODO: docstrings
// TODO: Fix RangeCompatible types

import { forLines } from "./scopes"
import { TextEditor, Selection } from "atom"

/**
 * interface LineInfo {
 * scope: readonly string[]
 * line: string
 * }
 */

/**
 *
 * @param {TextEditor} editor
 * @param {number} l
 * @returns {LineInfo}
 */
export function getLine(editor: TextEditor, l: number): LineInfo {
  return {
    scope: editor.scopeDescriptorForBufferPosition([l, 0]).getScopesArray(),
    line: editor.getTextInBufferRange([
      [l, 0],
      [l, Infinity]
    ])
  }
}

/**
 *
 * @param {LineInfo.line} line
 * @param {LineInfo.scope} scope
 * @param {boolean} allowDocstrings
 */
function isBlank({ line, scope }: LineInfo, allowDocstrings = false) {
  for (const s of scope) {
    if (/\bcomment\b/.test(s) || (!allowDocstrings && /\bdocstring\b/.test(s))) {
      return true
    }
  }
  return /^\s*(#.*)?$/.test(line)
}

/**
 *
 * @param {LineInfo} lineInfo
 */
function isEnd(lineInfo: LineInfo) {
  if (isStringEnd(lineInfo)) {
    return true
  }
  return /^(end\b|\)|]|})/.test(lineInfo.line)
}

/**
 *
 * @param {LineInfo} lineInfo
 */
function isStringEnd(lineInfo: LineInfo) {
  const scope = lineInfo.scope.join(" ")
  return /\bstring\.multiline\.end\b/.test(scope) || (/\bstring\.end\b/.test(scope) && /\bbacktick\b/.test(scope))
}

/**
 *
 * @param {LineInfo} lineInfo
 */
function isCont(lineInfo: LineInfo) {
  const scope = lineInfo.scope.join(" ")
  if (/\bstring\b/.test(scope) && !/\bpunctuation\.definition\.string\b/.test(scope)) {
    return true
  }

  return lineInfo.line.match(/^(else|elseif|catch|finally)\b/)
}

/**
 *
 * @param {LineInfo} lineInfo
 */
function isStart(lineInfo: LineInfo) {
  return !(/^\s/.test(lineInfo.line) || isBlank(lineInfo) || isEnd(lineInfo) || isCont(lineInfo))
}

/**
 *
 * @param {TextEditor} editor
 * @param {number} row
 */
function walkBack(editor: TextEditor, row: number) {
  while (row > 0 && !isStart(getLine(editor, row))) {
    row--
  }
  return row
}

/**
 *
 * @param {TextEditor} editor
 * @param {number} start
 */
function walkForward(editor: TextEditor, start: number) {
  let end = start
  let mark = start
  while (mark < editor.getLastBufferRow()) {
    mark++
    const lineInfo = getLine(editor, mark)

    if (isStart(lineInfo)) {
      break
    }
    if (isEnd(lineInfo)) {
      // An `end` only counts when  there still are unclosed blocks (indicated by `forLines`
      // returning a non-empty array).
      // If the line closes a multiline string we also take that as ending the block.
      if (!(forLines(editor, start, mark - 1).length === 0) || isStringEnd(lineInfo)) {
        end = mark
      }
    } else if (!(isBlank(lineInfo) || isStart(lineInfo))) {
      end = mark
    }
  }
  return end
}

/**
 *
 * @param {TextEditor} editor
 * @param {number} row
 * @returns {[[number, number], [number, number]] | undefined}
 */
function getRange(editor: TextEditor, row: number): [[number, number], [number, number]] | undefined {
  const start = walkBack(editor, row)
  const end = walkForward(editor, start)
  if (start <= row && row <= end) {
    return [
      [start, 0],
      [end, Infinity]
    ]
  } else {
    return undefined // TODO: make sure returned range from getRanges is not undefined
  }
}

/**
 *
 * @param {TextEditor} editor
 * @param {Selection} selection
 */
function getSelection(editor: TextEditor, selection: Selection) {
  const { start, end } = selection.getBufferRange()
  const range = [
    [start.row, start.column],
    [end.row, end.column]
  ]
  while (isBlank(getLine(editor, range[0][0]), true) && range[0][0] <= range[1][0]) {
    range[0][0]++
    range[0][1] = 0
  }
  while (isBlank(getLine(editor, range[1][0]), true) && range[1][0] >= range[0][0]) {
    range[1][0]--
    range[1][1] = Infinity
  }
  return range
}

/**
 *
 * @param {TextEditor} editor
 * @param {Selection} selection
 * @param {[[number, number], [number, number]]} range
 */
export function moveNext(editor: TextEditor, selection: Selection, range: [[number, number], [number, number]]) {
  // Ensure enough room at the end of the buffer
  const row = range[1][0]
  let last
  while ((last = editor.getLastBufferRow()) < row + 2) {
    if (last !== row && !isBlank(getLine(editor, last))) {
      break
    }
    selection.setBufferRange([
      [last, Infinity],
      [last, Infinity]
    ])
    selection.insertText("\n")
  }
  // Move the cursor
  let to = row + 1
  while (to < editor.getLastBufferRow() && isBlank(getLine(editor, to))) {
    to++
  }
  to = walkForward(editor, to)
  return selection.setBufferRange([
    [to, Infinity],
    [to, Infinity]
  ])
}

/**
 *
 * @param {TextEditor} editor
 */
function getRanges(editor: TextEditor) {
  const ranges = editor.getSelections().map(selection => {
    return {
      selection: selection,
      range: selection.isEmpty()
            ? getRange(editor, selection.getHeadBufferPosition().row)
            : getSelection(editor, selection)
    }
    // TODO: replace with getBufferRowRange? (getHeadBufferPosition isn't a public API)
  })
  return ranges.filter(({ range }) => {
    return range && editor.getTextInBufferRange(range).trim()
  })
}

/**
 *
 * @param {TextEditor} editor
 */
export function get(editor: TextEditor) {
  return getRanges(editor).map(({ range, selection }) => {
    return {
      range,
      selection,
      line: range[0][0],
      text: editor.getTextInBufferRange(range)
    }
  })
}

/**
 *
 * @param {TextEditor} editor
 * @param {number} row
 */
export function getLocalContext(editor: TextEditor, row: number) {
  const range = getRange(editor, row)
  const context = range ? editor.getTextInBufferRange(range) : ""
  // NOTE:
  // backend code expects startRow to be number for most cases, e.g.: `row = row - startRow`
  // so let's just return `0` when there is no local context
  // to check there is a context or not, just check `isempty(context)`
  const startRow = range ? range[0][0] : 0
  return {
    context,
    startRow
  }
}

/**
 *
 * @param {TextEditor | undefined} editor
 */
export function select(editor = atom.workspace.getActiveTextEditor()) {
  if (!editor) return
  return editor.mutateSelectedText(selection => {
    const range = getRange(editor, selection.getHeadBufferPosition().row)
    if (range) {
      selection.setBufferRange(range)
    }
  })
  // TODO: replace with getBufferRowRange? (getHeadBufferPosition isn't a public API)
}
