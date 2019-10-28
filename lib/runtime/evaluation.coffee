# TODO: this is very horrible, refactor
path = require 'path'
{dialog, BrowserWindow} = require('electron').remote

{client} =  require '../connection'
{notifications, views, selector, docpane} = require '../ui'
{paths, blocks, cells, words, weave} = require '../misc'
{processLinks} = require '../ui/docs'
workspace = require './workspace'
modules = require './modules'
{eval: evaluate, evalall, evalshow, cd, clearLazy, activateProject, activateDefaultProject} =
  client.import rpc: ['eval', 'evalall', 'evalshow'], msg: ['cd', 'clearLazy', 'activateProject', 'activateDefaultProject']
searchDoc = client.import('docs')

module.exports =
  _currentContext: ->
    editor = atom.workspace.getActiveTextEditor()
    mod = modules.current() ? 'Main'
    edpath = client.editorPath(editor) || 'untitled-' + editor.getBuffer().id
    {editor, mod, edpath}

  _showError: (r, lines) ->
    @errorLines?.lights.destroy()
    lights = @ink.highlights.errorLines (file: file, line: line-1 for {file, line} in lines)
    @errorLines = {r, lights}
    r.onDidDestroy =>
      if @errorLines?.r == r then @errorLines.lights.destroy()

  eval: ({move, cell}={}) ->
    {editor, mod, edpath} = @_currentContext()
    codeSelector = if cell? then cells else blocks
    # global options
    resultsDisplayMode = atom.config.get('julia-client.uiOptions.resultsDisplayMode')
    errorInRepl = atom.config.get('julia-client.uiOptions.errorInRepl')
    scrollToResult = atom.config.get('julia-client.uiOptions.scrollToResult')

    Promise.all codeSelector.get(editor).map ({range, line, text, selection}) =>
      codeSelector.moveNext editor, selection, range if move
      [[start], [end]] = range
      @ink.highlight editor, start, end
      rtype = if cell? then "block" else resultsDisplayMode
      if rtype is 'console'
        evalshow({text, line: line+1, mod, path: edpath})
        notifications.show "Evaluation Finished"
        workspace.update()
      else
        r = null
        setTimeout (=> r ?= new @ink.Result editor, [start, end], {type: rtype, scope: 'julia', goto: scrollToResult}), 0.1
        evaluate({text, line: line+1, mod, path: edpath, errorInRepl})
          .catch -> r?.destroy()
          .then (result) =>
            if not result?
              r?.destroy()
              console.error 'Error: Something went wrong while evaluating.'
              return
            error = result.type == 'error'
            view = if error then result.view else result
            if not r? or r.isDestroyed then r = new @ink.Result editor, [start, end], {type: rtype, scope: 'julia', goto: scrollToResult}
            registerLazy = (id) ->
              r.onDidDestroy client.withCurrent -> clearLazy [id]
              editor.onDidDestroy client.withCurrent -> clearLazy id
            r.setContent views.render(view, {registerLazy}), {error}
            if error
              atom.beep() if error
              @ink.highlight editor, start, end, 'error-line'
              if result.highlights?
                @_showError r, result.highlights
            notifications.show "Evaluation Finished"
            workspace.update()
            result

  evalAll: ->
    {editor, mod, edpath} = @_currentContext()
    atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
    [scope] = editor.getRootScopeDescriptor().getScopesArray()
    weaveScopes = ['source.weave.md', 'source.weave.latex']
    module = if weaveScopes.includes scope then mod else editor.juliaModule
    code = if weaveScopes.includes scope then weave.getCode editor else editor.getText()
    evalall({
      path: edpath
      module: module
      code: code
    }).then (result) ->
      notifications.show "Evaluation Finished"
      workspace.update()

  toggleDocs: (word, range) ->
    {editor, mod, edpath} = @_currentContext()
    {word, range} = words.getWord(editor) unless word? and range?
    if word.length == 0 || !isNaN(word) then return
    searchDoc({word: word, mod: mod}).then (result) =>
      if result.error then return
      v = views.render result
      processLinks(v.getElementsByTagName('a'))
      if atom.config.get('julia-client.uiOptions.docsDisplayMode') == 'inline'
        d = new @ink.InlineDoc editor, range,
          content: v
          highlight: true
        d.view.classList.add 'julia'
      else
        docpane.ensureVisible()
        docpane.showDocument(v, [])

  # Working Directory

  _cd: (dir) ->
    if atom.config.get('julia-client.juliaOptions.persistWorkingDir')
      atom.config.set('julia-client.juliaOptions.workingDir', dir)
    cd(dir)

  cdHere: (el) ->
    dir = @currentDir(el)
    if dir
      @_cd(dir)

  activateProject: (el) ->
    dir = @currentDir(el)
    if dir
      activateProject(dir)

  activateDefaultProject: ->
    activateDefaultProject()

  currentDir: (el) ->
    # invoked from tree-view context menu
    dirEl = el.closest('.directory')
    if dirEl
      pathEl = dirEl.querySelector('[data-path]')
      if pathEl
        return pathEl.dataset.path
    # invoked from normal command usage
    file = client.editorPath(atom.workspace.getCenter().getActiveTextEditor())
    if file
      return path.dirname(file)

    atom.notifications.addError 'This file has no path.'
    return null

  cdProject: ->
    dirs = atom.project.getPaths()
    if dirs.length < 1
      atom.notifications.addError 'This project has no folders.'
    else if dirs.length == 1
      @_cd dirs[0]
    else
      selector.show(dirs).then (dir) =>
        return unless dir?
        @_cd dir

  cdHome: ->
    @_cd paths.home()

  cdSelect: ->
    opts = properties: ['openDirectory']
    dialog.showOpenDialog BrowserWindow.getFocusedWindow(), opts, (path) =>
      if path? then @_cd path[0]
