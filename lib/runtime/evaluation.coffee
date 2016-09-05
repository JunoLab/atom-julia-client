path = require 'path'
{dialog, BrowserWindow} = require('electron').remote

{client} =  require '../connection'
{notifications, views, selector} = require '../ui'
{paths, blocks, words} = require '../misc'
modules = require './modules'

{eval: evaluate, evalall, cd, clearLazy} = client.import rpc: ['eval', 'evalall'], msg: ['cd', 'clearLazy']

module.exports =
  # calls `fn` with the current editor, module and editorpath
  withCurrentContext: (fn) ->
    editor = atom.workspace.getActiveTextEditor()
    mod = modules.current() ? 'Main'
    edpath = editor.getPath() || 'untitled-' + editor.getBuffer().id
    fn {editor, mod, edpath}

  eval: ({move}={}) ->
    @withCurrentContext ({editor, mod, edpath}) =>
      Promise.all blocks.get(editor).map ({range, line, text, selection}) =>
        blocks.moveNext editor, selection, range if move
        [[start], [end]] = range
        @ink.highlight editor, start, end
        r = null
        setTimeout (=> r ?= new @ink.Result editor, [start, end]), 0.1
        evaluate({text, line: line+1, mod, path: edpath})
          .then (result) =>
            error = result.type == 'error'
            view = if error then result.view else result
            r ?= new @ink.Result editor, [start, end]
            registerLazy = (id) -> r.onDidDestroy -> clearLazy id
            r.setContent views.render(view, {registerLazy}), {error}
            r.view.classList.add 'julia'
            if error and result.highlights?
              @showError r, result.highlights
            notifications.show "Evaluation Finished"
            require('../runtime').workspace.update()
            result
          .catch -> r?.destroy()

  evalAll: ->
    editor = atom.workspace.getActiveTextEditor()
    atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
    evalall({
              path: editor.getPath()
              module: editor.juliaModule
              code: editor.getText()
            }).then (result) ->
        notifications.show "Evaluation Finished"
        require('../runtime').workspace.update()

  gotoSymbol: ->
    @withCurrentContext ({editor, mod}) =>
      words.withWord editor, (word, range) =>
        client.import("methods")({word: word, mod: mod}).then (result) => # 149

  toggleDocs: ->
    @withCurrentContext ({editor, mod}) =>
      words.withWord editor, (word, range) =>
        client.import("docs")({word: word, mod: mod}).then (result) =>
          if result.error then return
          d = new @ink.InlineDoc editor, range,
            content: views.render result
            highlight: true
          d.view.classList.add 'julia'

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
