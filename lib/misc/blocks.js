"use strict"
// TODO: docstrings
// TODO: Fix RangeCompatible types
Object.defineProperty(exports, "__esModule", { value: true })
const scopes_1 = require("./scopes")
function getLine(editor, l) {
  return {
    scope: editor.scopeDescriptorForBufferPosition([l, 0]).getScopesArray(),
    line: editor.getTextInBufferRange([
      [l, 0],
      [l, Infinity],
    ]),
  }
}
exports.getLine = getLine
function isBlank({ line, scope }, allowDocstrings = false) {
  for (const s of scope) {
    if (/\bcomment\b/.test(s) || (!allowDocstrings && /\bdocstring\b/.test(s))) {
      return true
    }
  }
  return /^\s*(#.*)?$/.test(line)
}
function isEnd(lineInfo) {
  if (isStringEnd(lineInfo)) {
    return true
  }
  return /^(end\b|\)|]|})/.test(lineInfo.line)
}
function isStringEnd(lineInfo) {
  const scope = lineInfo.scope.join(" ")
  return /\bstring\.multiline\.end\b/.test(scope) || (/\bstring\.end\b/.test(scope) && /\bbacktick\b/.test(scope))
}
function isCont(lineInfo) {
  const scope = lineInfo.scope.join(" ")
  if (/\bstring\b/.test(scope) && !/\bpunctuation\.definition\.string\b/.test(scope)) {
    return true
  }
  return lineInfo.line.match(/^(else|elseif|catch|finally)\b/)
}
function isStart(lineInfo) {
  return !(/^\s/.test(lineInfo.line) || isBlank(lineInfo) || isEnd(lineInfo) || isCont(lineInfo))
}
function walkBack(editor, row) {
  while (row > 0 && !isStart(getLine(editor, row))) {
    row--
  }
  return row
}
function walkForward(editor, start) {
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
      if (!(scopes_1.forLines(editor, start, mark - 1).length === 0) || isStringEnd(lineInfo)) {
        end = mark
      }
    } else if (!(isBlank(lineInfo) || isStart(lineInfo))) {
      end = mark
    }
  }
  return end
}
function getRange(editor, row) {
  const start = walkBack(editor, row)
  const end = walkForward(editor, start)
  if (start <= row && row <= end) {
    return [
      [start, 0],
      [end, Infinity],
    ]
  } else {
    return undefined // TODO: make sure returned range from getRanges is not undefined
  }
}
function getSelection(editor, selection) {
  const { start, end } = selection.getBufferRange()
  const range = [
    [start.row, start.column],
    [end.row, end.column],
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
function moveNext(editor, selection, range) {
  // Ensure enough room at the end of the buffer
  const row = range[1][0]
  let last
  while ((last = editor.getLastBufferRow()) < row + 2) {
    if (last !== row && !isBlank(getLine(editor, last))) {
      break
    }
    selection.setBufferRange([
      [last, Infinity],
      [last, Infinity],
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
    [to, Infinity],
  ])
}
exports.moveNext = moveNext
function getRanges(editor) {
  const ranges = editor.getSelections().map((selection) => {
    return {
      selection: selection,
      range: selection.isEmpty()
        ? getRange(editor, selection.getHeadBufferPosition().row)
        : getSelection(editor, selection),
    }
    // TODO: replace with getBufferRowRange? (getHeadBufferPosition isn't a public API)
  })
  return ranges.filter(({ range }) => {
    return range && editor.getTextInBufferRange(range).trim()
  })
}
function get(editor) {
  return getRanges(editor).map(({ range, selection }) => {
    return {
      range,
      selection,
      line: range[0][0],
      text: editor.getTextInBufferRange(range),
    }
  })
}
exports.get = get
function getLocalContext(editor, row) {
  const range = getRange(editor, row)
  const context = range ? editor.getTextInBufferRange(range) : ""
  // NOTE:
  // backend code expects startRow to be number for most cases, e.g.: `row = row - startRow`
  // so let's just return `0` when there is no local context
  // to check there is a context or not, just check `isempty(context)`
  const startRow = range ? range[0][0] : 0
  return {
    context,
    startRow,
  }
}
exports.getLocalContext = getLocalContext
function select(editor = atom.workspace.getActiveTextEditor()) {
  if (!editor) return
  return editor.mutateSelectedText((selection) => {
    const range = getRange(editor, selection.getHeadBufferPosition().row)
    if (range) {
      selection.setBufferRange(range)
    }
  })
  // TODO: replace with getBufferRowRange? (getHeadBufferPosition isn't a public API)
}
exports.select = select
