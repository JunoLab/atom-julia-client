comm = require './connection/comm'

module.exports =
  cursor: ({row, column}) ->
    row: row+1
    column: column+1

  evalData: (editor, selection) ->
    start = selection.getHeadBufferPosition()
    end = selection.getTailBufferPosition()
    if not start.isLessThan end then [start, end] = [end, start]

    code: editor.getText()
    module: editor.juliaModule
    path: editor.getPath()
    start: @cursor start
    end: @cursor end

  eval: ->
    editor = atom.workspace.getActiveTextEditor()
    for sel in editor.getSelections()
      comm.msg 'eval', @evalData(editor, sel), (result) ->
        # console.log result
