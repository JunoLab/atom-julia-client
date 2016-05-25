{CompositeDisposable} = require 'atom'

{views} = require '../ui'
{client} = require '../connection'

{workspace} = client.import 'workspace'

module.exports =
  activate: ->
    @create()

    @subs = new CompositeDisposable

    @subs.add atom.workspace.addOpener (uri) =>
      if uri is 'atom://julia-client/workspace'
        @ws

    client.onDisconnected =>
      @ws.setItems []

  deactivate: ->
    @subs.dispose()

  update: ->
    return @ws.setItems [] unless client.isConnected()
    p = workspace('Main').then (ws) =>
      for {items} in ws
        for item in items
          item.value = views.render item.value
      @ws.setItems ws
    p.catch (err) ->
      console.error 'Error refreshing workspace'
      console.error err

  create: ->
    @ws = @ink.Workspace.fromId 'julia'

  open: ->
    @ws.activate() ||
      atom.workspace.open 'atom://julia-client/workspace'
