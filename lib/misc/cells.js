'use babel'

import { get as weaveGet,
         moveNext as weaveMoveNext,
         movePrev as weaveMovePrev } from './weave.js'

import { getLine } from './blocks.js'

import { Point } from 'atom'

export function getRange (ed) {
  // Cell range is:
  //  Start of line below top delimiter (and/or start of top row of file) to
  //  End of line before end delimiter
  var buffer = ed.getBuffer()
  var start = buffer.getFirstPosition()
  var end = buffer.getEndPosition()
  var regexString = '^(' + atom.config.get('julia-client.uiOptions.cellDelimiter').join('|') + ')'
  var regex = new RegExp(regexString)
  var cursor = ed.getCursorBufferPosition()
  cursor.column = Infinity // cursor on delimiter line means eval cell below


  let foundDelim = false
  for (let i = cursor.row + 1; i <= ed.getLastBufferRow(); i++) {
    let {line, scope} = getLine(ed, i)
    foundDelim = regex.test(line) && scope.join('.').indexOf('comment.line') > -1
    end.row = i
    if (foundDelim) break
  }

  if (foundDelim) {
    end.row -= 1
    if (end.row < 0) end.row = 0
    end.column = Infinity
  }

  foundDelim = false
  if (cursor.row > 0) {
    for (let i = end.row; i >= 0; i--) {
      let {line, scope} = getLine(ed, i)
      foundDelim = regex.test(line) && scope.join('.').indexOf('comment.line') > -1
      start.row = i
      if (foundDelim) {
        break
      }
    }
    start.column = 0
  }

  return [start, end]
}

export function get (ed) {
  if (ed.getGrammar().scopeName.indexOf('source.julia') > -1) {
    return jlGet(ed)
  } else {
    return weaveGet(ed)
  }
}

function jlGet (ed) {
  var range = getRange(ed)
  var text = ed.getTextInBufferRange(range)
  if (text.trim() === '') text = ' '
  var res = {
    range: [[range[0].row, range[0].column], [range[1].row, range[1].column]],
    selection: ed.getSelections()[0],
    line: range[0].row,
    text: text
  }
  return [res]
}

export function moveNext (ed) {
  if (ed == null) {
    ed = atom.workspace.getActiveTextEditor()
  }
  if (ed.getGrammar().scopeName.indexOf('source.julia') > -1) {
    return jlMoveNext(ed)
  } else {
    return weaveMoveNext(ed)
  }
}

function jlMoveNext (ed) {
  var range = getRange(ed)
  var sel = ed.getSelections()[0]
  var nextRow = range[1].row + 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  return sel.setBufferRange([[nextRow, 0], [nextRow, 0]])
}

export function movePrev (ed) {
  if (ed == null) {
    ed = atom.workspace.getActiveTextEditor()
  }
  if (ed.getGrammar().scopeName.indexOf('source.weave') > -1) {
    return weaveMovePrev(ed)
  } else {
    return jlMovePrev(ed)
  }
}

function jlMovePrev (ed) {
  var range = getRange(ed)
  var prevRow = range[0].row - 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  var sel = ed.getSelections()[0]
  return sel.setBufferRange([[prevRow, 0], [prevRow, 0]])
}
