path = require 'path'
remote = require 'remote'
dialog = remote.require 'dialog'
BrowserWindow = remote.require 'browser-window'

{client} =  require '../connection'
{notifications, views, selector} = require '../ui'
{paths, blocks, words} = require '../misc'
modules = require './modules'

{eval: evaluate, evalall, cd} = client.import rpc: ['eval', 'evalall'], msg: ['cd']

module.exports =
  # calls `fn` with the current editor, module and editorpath
  withCurrentContext: (fn) ->
    editor = atom.workspace.getActiveTextEditor()
    mod = modules.current() # TODO: may not work in all cases
    edpath = editor.getPath() || 'untitled-' + editor.getBuffer().id
    fn {editor, mod, edpath}

  eval: ({move}={}) ->
    @withCurrentContext ({editor, mod, edpath}) =>
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

  evalAll: ->
    editor = atom.workspace.getActiveTextEditor()
    atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
    evalall({
              path: editor.getPath()
              module: editor.juliaModule
              code: editor.getText()
            }).then (result) ->
        notifications.show "Evaluation Finished"

  gotoSymbol: ->
    @withCurrentContext ({editor, mod}) =>
      words.withWord editor, (word, range) =>
        client.rpc("methods", {word: word, mod: mod}).then (result) => # 149

  toggleDocs: ->
    @withCurrentContext ({editor, mod}) =>
      words.withWord editor, (word, range) =>
        client.rpc("docs", {word: word, mod: mod}).then (result) =>
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
