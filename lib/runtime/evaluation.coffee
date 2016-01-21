{client} =  require '../connection'
{notifications, views} = require '../ui'

module.exports =
  client: client.import ['eval', 'evalall'], true

  cursor: ({row, column}) ->
    row: row+1
    column: column+1

  evalData: (editor, selection) ->
    start = selection.getHeadBufferPosition()
    stop = selection.getTailBufferPosition()
    if not start.isLessThan stop then [start, stop] = [stop, start]

    code: editor.getText()
    module: editor.juliaModule
    path: editor.getPath() || 'untitled-' + editor.getBuffer().inkId
    start: @cursor start
    stop: @cursor stop

  # TODO: get block bounds as a seperate step
  # TODO: implement block finding in Atom
  eval: ->
    editor = atom.workspace.getActiveTextEditor()
    for sel in editor.getSelections()
      @client.eval(@evalData(editor, sel)).then ({start, end, result, plainresult}) =>
        if result?
          error = result.type == 'error'
          view = if error then result.view else result
          fade = not @ink.Result.removeLines editor, start-1, end-1
          r = new @ink.Result editor, [start-1, end-1],
            content: views.render view
            error: error
            fade: fade
          r.view.classList.add 'julia'
          if error and result.highlights?
            @showError r, result.highlights
          notifications.show "Evaluation Finished"

  # get documentation or methods for the current word
  toggleMeta: (type) ->
    editor = atom.workspace.getActiveTextEditor()
    [word, range] = @getWord editor
    # if we only find numbers or nothing, return prematurely
    if word.length == 0 || !isNaN(word) then return
    client.rpc(type, word).then ({result}) =>
      view = if result.type then result.view else result
      view = @ink.tree.fromJson(view)[0]
      @ink.links.linkify view
      r = @ink.results.toggleUnderline editor, range,
        content: view
        clas: 'julia'

  # gets the word and its range in the `editor` which the last cursor is on
  getWord: (editor) ->
    cursor = editor.getLastCursor()
    # The following line is kinda iffy: The regex may or may not be well chosen
    # and it duplicates the efforts from atom-language-julia. It might be better
    # to select the current word via finding the smallest <span> containing the
    # cursor which also has `function` or `macro` as its class.
    range = cursor.getCurrentWordBufferRange({wordRegex: /[\u00A0-\uFFFF\w_!´]*\.?@?[\u00A0-\uFFFF\w_!´]+/})
    word = editor.getTextInBufferRange range
    [word, range]

  evalAll: ->
    editor = atom.workspace.getActiveTextEditor()
    @client.evalall({
                      path: editor.getPath()
                      module: editor.juliaModule
                      code: editor.getText()
                    }).then (result) ->
        notifications.show "Evaluation Finished"

  showError: (r, lines) ->
    @errorLines?.lights.destroy()
    lights = @ink.highlights.errorLines (file: file, line: line-1 for {file, line} in lines)
    @errorLines = {r, lights}

    destroyResult = r.destroy.bind r
    r.destroy = =>
      if @errorLines?.r == r
        @errorLines.lights.destroy()
      destroyResult()
