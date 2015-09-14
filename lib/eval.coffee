client = require './connection/client'
notifications = require './ui/notifications'

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

  # TODO: get block bounds as a seperate step
  # TODO: implement block finding in Atom
  eval: ->
    editor = atom.workspace.getActiveTextEditor()
    for sel in editor.getSelections()
      client.msg 'eval', @evalData(editor, sel), ({start, end, result}) =>
        if result.type
          view = result.view
        else
          view = result
        view = @ink.tree.fromJson(view)[0]
        @ink.links.linkify view
        @ink?.results.showForLines editor, start-1, end-1,
          content: view
          error: result.type == 'error'
          clas: 'julia'
        notifications.show "Evaluation Finished"

  evalAll: ->
    editor = atom.workspace.getActiveTextEditor()
    client.msg 'eval-all', {
                          path: editor.getPath()
                          module: editor.juliaModule
                          code: editor.getText()
                         },
      (result) =>
        notifications.show "Evaluation Finished"
