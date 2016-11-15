{CompositeDisposable} = require 'atom'

{views} = require '../ui'
{client} = require '../connection'

{workspace, clearLazy} = client.import rpc: 'workspace', msg: 'clearLazy'

module.exports =
  activate: ->
    @create()

    client.onDetached =>
      @ws.setItems []
      @lazyTrees = []

  lazyTrees: []

  update: ->
    return @ws.setItems [] unless client.isActive() and @ws.currentPane()
    clearLazy @lazyTrees
    registerLazy = (id) => @lazyTrees.push id
    p = workspace('JunoMain').then (ws) =>
      for {items} in ws
        for item in items
          item.value = views.render item.value, {registerLazy}
      @ws.setItems ws
    p.catch (err) ->
      if err isnt 'disconnected'
        console.error 'Error refreshing workspace'
        console.error err

  create: ->
    @ws = @ink.Workspace.fromId 'julia'

  open: -> @ws.open split: 'right'
