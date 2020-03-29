"use babel"

import { get as weaveGet, moveNext as weaveMoveNext, movePrev as weaveMovePrev } from "./weave.js"

import { getLine } from "./blocks.js"

import { Point, TextEditor } from "atom"

export function getRange(editor: TextEditor): [Point, Point] {
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
  for (let i = cursor.row + 1; i <= editor.getLastBufferRow(); i++) {
    const { line, scope } = getLine(editor, i)
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
      const { line, scope } = getLine(editor, i)
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

export function get(editor: TextEditor) {
  if (editor.getGrammar().scopeName.indexOf("source.julia") > -1) {
    return jlGet(editor)
  } else {
    return weaveGet(editor)
  }
}

function jlGet(editor: TextEditor) {
  const range = getRange(editor)
  let text = editor.getTextInBufferRange(range)
  if (text.trim() === "") text = " "
  const res = {
    range: [
      [range[0].row, range[0].column],
      [range[1].row, range[1].column],
    ],
    selection: editor.getSelections()[0],
    line: range[0].row,
    text: text,
  }
  return [res]
}

export function moveNext(editor: TextEditor) {
  if (editor == null) {
    editor = atom.workspace.getActiveTextEditor()
  }
  if (editor.getGrammar().scopeName.indexOf("source.julia") > -1) {
    return jlMoveNext(editor)
  } else {
    return weaveMoveNext(editor)
  }
}

function jlMoveNext(editor: TextEditor) {
  const range = getRange(editor)
  const sel = editor.getSelections()[0]
  const nextRow = range[1].row + 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  return sel.setBufferRange([
    [nextRow, 0],
    [nextRow, 0],
  ])
}

export function movePrev(editor: TextEditor) {
  if (editor == null) {
    editor = atom.workspace.getActiveTextEditor()
  }
  if (editor.getGrammar().scopeName.indexOf("source.weave") > -1) {
    return weaveMovePrev(editor)
  } else {
    return jlMovePrev(editor)
  }
}

function jlMovePrev(editor: TextEditor) {
  const range = getRange(editor)
  const prevRow = range[0].row - 2 // 2 = 1 to get to delimiter line + 1 more to go past it
  const sel = editor.getSelections()[0]
  return sel.setBufferRange([
    [prevRow, 0],
    [prevRow, 0],
  ])
}
