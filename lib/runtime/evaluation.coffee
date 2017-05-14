path = require 'path'
{dialog, BrowserWindow} = require('electron').remote

{client} =  require '../connection'
{notifications, views, selector} = require '../ui'
{paths, blocks, cells, words} = require '../misc'
workspace = require './workspace'
modules = require './modules'

{eval: evaluate, evalall, evalrepl, cd, clearLazy} =
    client.import rpc: ['eval', 'evalall', 'evalrepl'], msg: ['cd', 'clearLazy']

module.exports =
  # calls `fn` with the current editor, module and editorpath
  withCurrentContext: (fn) ->
    editor = atom.workspace.getActiveTextEditor()
    mod = modules.current() ? 'Main'
    edpath = editor.getPath() || 'untitled-' + editor.getBuffer().id
    fn {editor, mod, edpath}

  # TODO: this is very horrible, refactor
  eval: ({move, cell}={}) ->
    @withCurrentContext ({editor, mod, edpath}) =>
      selector = if cell? then cells else blocks
      Promise.all selector.get(editor).map ({range, line, text, selection}) =>
        selector.moveNext editor, selection, range if move
        [[start], [end]] = range
        @ink.highlight editor, start, end
        rtype = if cell? then "block" else atom.config.get 'julia-client.resultsDisplayMode'
        if rtype is 'console'
          evalrepl(code: text, mod: mod)
            .then (result) => workspace.update()
            .catch =>
        else
          r = null
          setTimeout (=> r ?= new @ink.Result editor, [start, end], {type: rtype, scope: 'julia'}), 0.1
          evaluate({text, line: line+1, mod, path: edpath})
            .then (result) =>
              error = result.type == 'error'
              view = if error then result.view else result
              if not r? or r.isDestroyed then r = new @ink.Result editor, [start, end], {type: rtype, scope: 'julia'}
              registerLazy = (id) ->
                r.onDidDestroy client.withCurrent -> clearLazy [id]
                editor.onDidDestroy client.withCurrent -> clearLazy id
              r.setContent views.render(view, {registerLazy}), {error}
              if error and result.highlights?
                @showError r, result.highlights
              atom.beep() if error
              notifications.show "Evaluation Finished"
              workspace.update()
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
        workspace.update()

  gotoSymbol: ->
    @withCurrentContext ({editor, mod}) =>
      words.withWord editor, (word, range) =>
        client.import("methods")({word: word, mod: mod}).then (symbols) =>
          @ink.goto.goto symbols unless symbols.error

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
    r.onDidDestroy =>
      if @errorLines?.r == r then @errorLines.lights.destroy()

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
