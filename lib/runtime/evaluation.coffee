path = require 'path'
remote = require 'remote'
dialog = remote.require 'dialog'
BrowserWindow = remote.require 'browser-window'

{client} =  require '../connection'
{notifications, views, selector} = require '../ui'
{paths, blocks} = require '../misc'
modules = require './modules'

{eval: evaluate, evalall, cd} = client.import rpc: ['eval', 'evalall'], msg: ['cd']

module.exports =

  eval: ({move}={}) ->
    editor = atom.workspace.getActiveTextEditor()
    mod = modules.current() # TODO: may not work in all cases
    edpath = editor.getPath() || 'untitled-' + editor.getBuffer().id
    blocks.get(editor, move: true).forEach ({range, line, text, selection}) =>
      blocks.moveNext editor, selection, range if move
      [[start], [end]] = range
      @ink.highlight editor, start, end
      r = null
      setTimeout (=> r ?= new @ink.Result editor, [start, end], loading: true), 0.1
      evaluate({text, line: line+1, mod, path: edpath})
        .then (result) =>
          error = result.type == 'error'
          view = if error then result.view else result
          r ?= new @ink.Result editor, [start, end]
          r.setContent views.render(view), {error}
          r.view.classList.add 'julia'
          if error and result.highlights?
            @showError r, result.highlights
          notifications.show "Evaluation Finished"
          require('../runtime').workspace.update()
        .catch -> r?.destroy()

  # get documentation or methods for the current word
  toggleMeta: (type) ->
    mod = modules.current()
    mod = if mod then mod else 'Main'
    editor = atom.workspace.getActiveTextEditor()
    [word, range] = @getWord editor
    # if we only find numbers or nothing, return prematurely
    if word.length == 0 || !isNaN(word) then return
    client.rpc(type, {word: word, mod: mod}).then ({result}) =>
      if result?
        error = result.type == 'error'
        view = if error then result.view else result
        fade = not @ink.Result.removeLines editor, range.start.row, range.end.row
        r = new @ink.Result editor, [range.start.row, range.end.row],
          content: views.render view
          error: error
          fade: fade

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
    atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
    evalall({
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

  # Working Directory

  cdHere: ->
    file = atom.workspace.getActiveTextEditor()?.getPath()
    file? or atom.notifications.addError 'This file has no path.'
    cd path.dirname(file)

  cdProject: ->
    dirs = atom.project.getPaths()
    if dirs.length < 1
      atom.notifications.addError 'This project has no folders.'
    else if dirs.length == 1
      cd dirs[0]
    else
      selector.show(dirs).then (dir) =>
        return unless dir?
        cd dir

  cdHome: ->
    cd paths.home()

  cdSelect: ->
    opts = properties: ['openDirectory']
    dialog.showOpenDialog BrowserWindow.getFocusedWindow(), opts, (path) ->
      if path? then cd path[0]
