'use babel'
// TODO: docstrings

import { forLines } from './scopes'

export function getLine (ed, l) {
  return {
    scope: ed.scopeDescriptorForBufferPosition([l, 0]).scopes,
    line: ed.getTextInBufferRange([[l, 0], [l, Infinity]])
  }
}

function isBlank ({line, scope}, allowDocstrings = false) {
  for (const s of scope) {
    if (/\bcomment\b/.test(s) || (!allowDocstrings && /\bdocstring\b/.test(s))) {
      return true
    }
  }
  return /^\s*(#.*)?$/.test(line)
}
function isEnd ({ line, scope }) {
  if (isStringEnd({ line, scope })) {
    return true
  }
  return /^(end\b|\)|\]|\})/.test(line)
}
function isStringEnd ({ line, scope }) {
  scope = scope.join(' ')
  return /\bstring\.multiline\.end\b/.test(scope) ||
        (/\bstring\.end\b/.test(scope) && /\bbacktick\b/.test(scope))
}
function isCont ({ line, scope }) {
  scope = scope.join(' ')
  if (/\bstring\b/.test(scope) && !(/\bpunctuation\.definition\.string\b/.test(scope))) {
    return true
  }

  return line.match(/^(else|elseif|catch|finally)\b/)
}
function isStart (lineInfo) {
  return !(/^\s/.test(lineInfo.line) || isBlank(lineInfo) || isEnd(lineInfo) || isCont(lineInfo))
}

function walkBack(ed, row) {
  while ((row > 0) && !isStart(getLine(ed, row))) {
    row--
  }
  return row
}

function walkForward (ed, start) {
  let end = start
  let mark = start
  while (mark < ed.getLastBufferRow()) {
    mark++
    const lineInfo = getLine(ed, mark)

    if (isStart(lineInfo)) {
      break
    }
    if (isEnd(lineInfo)) {
      // An `end` only counts when  there still are unclosed blocks (indicated by `forLines`
      // returning a non-empty array).
      // If the line closes a multiline string we also take that as ending the block.
      if (
            !(forLines(ed, start, mark-1).length === 0) ||
            isStringEnd(lineInfo)
         ) {
        end = mark
      }
    } else if (!(isBlank(lineInfo) || isStart(lineInfo))) {
      end = mark
    }
  }
  return end
}

function getRange (ed, row) {
  const start = walkBack(ed, row)
  const end = walkForward(ed, start)
  if (start <= row && row <= end) {
    return [[start, 0], [end, Infinity]]
  }
}

function getSelection (ed, sel) {
  const {start, end} = sel.getBufferRange()
  const range = [[start.row, start.column], [end.row, end.column]]
  while (isBlank(getLine(ed, range[0][0]), true) && (range[0][0] <= range[1][0])) {
    range[0][0]++
    range[0][1] = 0
  }
  while (isBlank(getLine(ed, range[1][0]), true) && (range[1][0] >= range[0][0])) {
    range[1][0]--
    range[1][1] = Infinity
  }
  return range
}

export function moveNext (ed, sel, range) {
  // Ensure enough room at the end of the buffer
  const row = range[1][0]
  let last
  while ((last = ed.getLastBufferRow()) < (row+2)) {
    if ((last !== row) && !isBlank(getLine(ed, last))) {
      break
    }
    sel.setBufferRange([[last, Infinity], [last, Infinity]])
    sel.insertText('\n')
  }
  // Move the cursor
  let to = row + 1
  while ((to < ed.getLastBufferRow()) && isBlank(getLine(ed, to))) {
    to++
  }
  to = walkForward(ed, to)
  return sel.setBufferRange([[to, Infinity], [to, Infinity]])
}

function getRanges (ed) {
  const ranges = ed.getSelections().map(sel => {
    return {
      selection: sel,
      range: sel.isEmpty() ?
        getRange(ed, sel.getHeadBufferPosition().row) :
        getSelection(ed, sel)
    }
  })
  return ranges.filter(({ range }) => {
    return range && ed.getTextInBufferRange(range).trim()
  })
}

export function get (ed) {
  return getRanges(ed).map(({ range, selection }) => {
    return {
      range,
      selection,
      line: range[0][0],
      text: ed.getTextInBufferRange(range)
    }
  })
}

export function getLocalContext (editor, row) {
  const range = getRange(editor, row)
  const context = range ? editor.getTextInBufferRange(range) : ''
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

export function select (ed = atom.workspace.getActiveTextEditor()) {
  if (!ed) return
  return ed.mutateSelectedText(selection => {
    const range = getRange(ed, selection.getHeadBufferPosition().row)
    if (range) {
      selection.setBufferRange(range)
    }
  })
}
