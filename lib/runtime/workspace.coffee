{CompositeDisposable} = require 'atom'

{views} = require '../ui'
{client} = require '../connection'

modules = require './modules'

{ workspace, goto, clearLazy } = client.import rpc: ['workspace', 'goto'], msg: 'clearLazy'

grammar = atom.grammars.grammarForScopeName 'source.julia'

module.exports =
  activate: ->
    @create()

    client.onDetached =>
      @ws.setItems []
      @lazyTrees = []

    atom.config.observe 'julia-client.uiOptions.layouts.workspace.defaultLocation', (defaultLocation) =>
      @ws.setDefaultLocation defaultLocation

  lazyTrees: []

  update: ->
    return @ws.setItems [] unless client.isActive() and @ws.currentPane()
    clearLazy @lazyTrees
    registerLazy = (id) => @lazyTrees.push id
    mod = if @mod == modules.follow then modules.current() else (@mod or 'Main')
    p = workspace(mod).then (ws) =>
      for {items} in ws
        for item in items
          item.value = views.render item.value, {registerLazy}
          item.onClick = @onClick(item.name)
      @ws.setItems ws
    p.catch (err) ->
      if err isnt 'disconnected'
        console.error 'Error refreshing workspace'
        console.error err

  onClick: (name) ->
    () =>
      editor = atom.workspace.getActiveTextEditor()
      path = if editor.getGrammar() == grammar then editor.getPath() else undefined
      goto
        word: name,
        mod: @mod,
        path: path, # as a fallback path
        onlytoplevel: true
      .then (symbols) =>
        return if symbols.error
        @ink.goto.goto symbols,
          pending: atom.config.get('core.allowPendingPaneItems')

  create: ->
    @ws = @ink.Workspace.fromId 'julia'
    @ws.setModule = (mod) => @mod = mod
    @ws.refresh = () => @update()
    @ws.refreshModule = () =>
      m = modules.chooseModule()
      if m?.then?
        m.then(() => @update())

  open: ->
    @ws.open
      split: atom.config.get 'julia-client.uiOptions.layouts.workspace.split'

  close: ->
    @ws.close()
