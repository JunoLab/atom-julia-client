'use babel'
// TODO: docstrings

import { forLines } from './scopes'

function getLine (ed, l) {
  return ed.getTextInBufferRange([[l, 0], [l, Infinity]])
}

function isBlank (l) {
  return l.match(/^\s*(#.*)?$/)
}
function isEnd (l) {
  return l.match(/^(end\b|\)|\]|\})/)
}
function isCont (l) {
  return l.match(/^(else|elseif|catch|finally)\b/)
}
function isStart (l) {
  return !(l.match(/^\s/) || isBlank(l) || isEnd(l) || isCont(l))
}

function walkBack(ed, row) {
  while ((row > 0) && !isStart(getLine(ed, row))) {
    row--
  }
  return row
}

function walkForward (ed, start) {
  let end
  let mark = (end = start)
  let multiline = false
  while (mark < ed.getLastBufferRow()) {
    mark++
    const l = getLine(ed, mark)
    if (multiline) {
      if (l.match(/=#/)) {
        multiline = false
      } else {
        continue
      }
    }
    if (isStart(l)) {
      break
    }
    if (isEnd(l)) {
      if (!(forLines(ed, start, mark-1).length === 0)) {
        end = mark
      }
    } else if (!(isBlank(l) || isStart(l))) {
      end = mark
    } else if (l.match(/#=/) && !l.match(/=#/)) {
      multiline = true
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
  while (isBlank(getLine(ed, range[0][0])) && (range[0][0] <= range[1][0])) {
    range[0][0]++
    range[0][1] = 0
  }
  while (isBlank(getLine(ed, range[1][0])) && (range[1][0] >= range[0][0])) {
    range[1][0]--
    range[1][1] = Infinity
  }
  return range
}

export function moveNext (ed, sel, range) {
  // Ensure enough room at the end of the buffer
  let row = range[1][0]
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
  const ranges = ed.getSelections().map((sel) => ({
    selection: sel,
    range: sel.isEmpty() ? getRange(ed, sel.getHeadBufferPosition().row) :
                           getSelection(ed, sel)
  }));
  return ranges.filter(({range}) => (range != null) && ed.getTextInBufferRange(range).trim())
}

export function get (ed) {
  const result = []
  for (let {range, selection} of getRanges(ed)) {
    result.push({
      range,
      selection,
      line: range[0][0],
      text: ed.getTextInBufferRange(range)
    })
  }
  return result
}

export function select (ed = atom.workspace.getActiveTextEditor()) {
  if (!ed) return
  return ed.mutateSelectedText(selection => {
    let range = getRange(ed, selection.getHeadBufferPosition().row)
    if (range) {
      selection.setBufferRange(range)
    }
  })
}
