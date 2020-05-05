{CompositeDisposable} = require 'atom'

{client} = require '../connection'
{views} = require '../ui'
goto = require './goto'
modules = require './modules'

{ workspace, gotosymbol: gotoSymbol, clearLazy } = client.import rpc: ['workspace', 'gotosymbol'], msg: 'clearLazy'

module.exports =
  activate: ->
    @create()

    client.handle { updateWorkspace: => @update() }
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
      mod = if @mod == modules.follow then modules.current() else (@mod or 'Main')
      gotoSymbol
        word: name,
        mod: mod
      .then (results) =>
        return if results.error
        goto.selectItemsAndGo(results.items)

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
