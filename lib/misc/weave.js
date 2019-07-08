'use babel'

import 'atom'

export function getCode (ed) {
  const text = ed.getText()
  const lines = text.split("\n")
  const N = ed.getLineCount()
  let code = ""

  for (let i = 0; i < N; i++) {
     let scopes = ed.scopeDescriptorForBufferPosition([i, 0]).scopes
     if (scopes.length > 1) {
         if (scopes.indexOf("source.embedded.julia") > -1) {
             code += lines[i] + "\n"
         }
     }
  }
  return code
}

function getEmbeddedScope (cursor) {
  let scopes = cursor.getScopeDescriptor().scopes
  let targetScope = null
  for (let scope of scopes) {
    if (scope.startsWith('source.embedded.')) {
      targetScope = scope
      break
    }
  }
  return targetScope
}

function getCurrentCellRange (ed, cursor) {
  let scope = getEmbeddedScope(cursor)
  if (scope === null) return null

  let start = cursor.getBufferRow()
  let end = start
  while (start - 1 >= 0 &&
         ed.scopeDescriptorForBufferPosition([start - 1, 0]).scopes.indexOf(scope) > -1) {
    start -= 1
  }
  while (end + 1 <= ed.getLastBufferRow() &&
         ed.scopeDescriptorForBufferPosition([end + 1, 0]).scopes.indexOf(scope) > -1) {
    end += 1
  }
  return [[start, 0], [end, Infinity]]
}

export function getCursorCellRanges (ed) {
  let ranges = []
  for (const cursor of ed.getCursors()) {
    let range = getCurrentCellRange(ed, cursor)
    if (range !== null) {
      ranges.push(range)
    }
  }
  return ranges
}

export function moveNext (ed) {
  for (const cursor of ed.getCursors()) {
    let scope = getEmbeddedScope(cursor)
    if (scope === null) return null

    let range = getCurrentCellRange(ed, cursor)
    let endRow = range[1][0] + 1
    while (endRow + 1 <= ed.getLastBufferRow() &&
           ed.scopeDescriptorForBufferPosition([endRow + 1, 0]).scopes.indexOf(scope) === -1) {
      endRow += 1
    }
    cursor.setBufferPosition([endRow+1, Infinity])
  }
}

export function movePrev (ed) {
  for (const cursor of ed.getCursors()) {
    let scope = getEmbeddedScope(cursor)
    if (scope === null) return null

    let range = getCurrentCellRange(ed, cursor)
    let startRow = range[0][0] - 1
    while (startRow - 1 >= 0 &&
           ed.scopeDescriptorForBufferPosition([startRow - 1, 0]).scopes.indexOf(scope) === -1) {
      startRow -= 1
    }
    cursor.setBufferPosition([startRow-1, Infinity])
  }
}

export function get (ed) {
  let ranges = getCursorCellRanges(ed)
  if (ranges.length === 0) return []

  let processedRanges = []
  for (let range of ranges) {
    let text = ed.getTextInBufferRange(range)
    range[1][0] += 1 // move result one line down
    processedRanges.push({
      range: range,
      selection: ed.getSelections()[0],
      line: range[0][0],
      text: text || ' '
    })
  }
  return processedRanges
}
