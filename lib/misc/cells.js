"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
const weave_js_1 = require("./weave.js")
const blocks_js_1 = require("./blocks.js")
function getRange(editor) {
  // Cell range is:
  //  Start of line below top delimiter (and/or start of top row of file) to
  //  End of line before end delimiter
  const buffer = editor.getBuffer()
  const start = buffer.getFirstPosition()
  const end = buffer.getEndPosition()
  const regexString = "^(" + atom.config.get("julia-client.uiOptions.cellDelimiter").join("|") + ")"
  const regex = new RegExp(regexString)
  const cursor = editor.getCursorBufferPosition()
  cursor.column = Infinity // cursor on delimiter line means eval cell below
  let foundDelim = false
  const editor_getLastBufferRow = editor.getLastBufferRow()
  for (let i = cursor.row + 1; i <= editor_getLastBufferRow; i++) {
    const { line, scope } = blocks_js_1.getLine(editor, i)
    foundDelim = regex.test(line) && scope.join(".").indexOf("comment.line") > -1
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
      const { line, scope } = blocks_js_1.getLine(editor, i)
      foundDelim = regex.test(line) && scope.join(".").indexOf("comment.line") > -1
      start.row = i
      if (foundDelim) {
        break
      }
    }
    start.column = 0
  }
  return [start, end]
}
exports.getRange = getRange
function get(editor) {
  if (editor.getGrammar().scopeName.indexOf("source.julia") > -1) {
    return jlGet(editor)
  } else {
    return weave_js_1.get(editor)
  }
}
exports.get = get
function jlGet(editor) {
  const range = getRange(editor)
  let text = editor.getTextInBufferRange(range)
  if (text.trim() === "") text = " "
  const res = {
    range: [
      [range[0].row, range[0].column],
      [range[1].row, range[1].column]
    ],
    selection: editor.getSelections()[0],
    line: range[0].row,
    text
  }
  return [res]
}
function moveNext(editor) {
  if (!editor) {
    editor = atom.workspace.getActiveTextEditor()
  }
  if (editor) {
    // TODO: do we need this?
    if (editor.getGrammar().scopeName.indexOf("source.julia") > -1) {
      return jlMoveNext(editor)
    } else {
      return weave_js_1.moveNext(editor)
    }
  } else {
    console.error("editor isn't acquired!")
  }
}
exports.moveNext = moveNext
function jlMoveNext(editor) {
  const range = getRange(editor)
  const sel = editor.getSelections()[0]
  const nextRow = range[1].row + 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  return sel.setBufferRange([
    [nextRow, 0],
    [nextRow, 0]
  ])
}
function movePrev(editor) {
  if (!editor) {
    editor = atom.workspace.getActiveTextEditor()
  }
  if (editor) {
    if (editor.getGrammar().scopeName.indexOf("source.weave") > -1) {
      return weave_js_1.movePrev(editor)
    } else {
      return jlMovePrev(editor)
    }
  }
}
exports.movePrev = movePrev
function jlMovePrev(editor) {
  const range = getRange(editor)
  const prevRow = range[0].row - 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  const sel = editor.getSelections()[0]
  return sel.setBufferRange([
    [prevRow, 0],
    [prevRow, 0]
  ])
}
//# sourceMappingURL=cells.js.map
