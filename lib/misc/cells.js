'use babel'

function getRange (ed) {
  // Cell range is:
  //  Start of line below top delimiter (and/or start of top row of file) to
  //  End of line before end delimiter
  var buffer = ed.getBuffer()
  var start = buffer.getFirstPosition()
  var end = buffer.getEndPosition()
  var regexString = '^(##|#---|#%%|# %%)'
  var regex = new RegExp(regexString)
  var cursor = ed.getCursorBufferPosition()
  cursor.column = 0 // cursor on delimiter line means eval cell above
  var foundStartDelim = false
  if (cursor.row > 0) {
    buffer.backwardsScanInRange(regex, [start, cursor], arg => {
      start = arg.range.start
      foundStartDelim = true
    })
  }
  if (foundStartDelim) {
    // cell range starts at the beginning of the row after the top delimiter
    start.row += 1
  }
  var foundEndDelim = false
  buffer.scanInRange(regex, [cursor, end], arg => {
    end = arg.range.start
    foundEndDelim = true
  })
  if (foundEndDelim) {
    // cell range ends at the end of the row before the end delimiter
    end.row -= 1
    end.column = Infinity
  }
  return [start, end]
}

export function get (ed) {
  var range = getRange(ed)
  var text = ed.getTextInBufferRange(range)
  if (text.trim() === '') text = ' '
  var res = {
    range: [[range[0].row, range[0].column], [range[1].row, range[1].column]],
    selection: ed.getSelections()[0],
    line: range[1].row,
    text: text
  }
  return [res]
}

export function moveNext (ed) {
  if (ed == null) {
    ed = atom.workspace.getActiveTextEditor()
  }
  var range = getRange(ed)
  var sel = ed.getSelections()[0]
  var nextRow = range[1].row + 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  return sel.setBufferRange([[nextRow, 0], [nextRow, 0]])
}

export function movePrev (ed) {
  if (ed == null) {
    ed = atom.workspace.getActiveTextEditor()
  }
  var range = getRange(ed)
  var prevRow = range[0].row - 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  var sel = ed.getSelections()[0]
  return sel.setBufferRange([[prevRow, 0], [prevRow, 0]])
}
