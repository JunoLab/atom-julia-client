{CompositeDisposable} = require 'atom'

{views} = require '../ui'
{client} = require '../connection'

{workspace} = client.import 'workspace'

module.exports =
  activate: ->
    @create()

    client.onDisconnected =>
      @ws.setItems []

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

  open: -> @ws.open split: 'right'
