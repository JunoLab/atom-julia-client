module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'

  activate: (@client) ->
    @notifications.activate()
    @client.onConnected =>
      @notifications.show("Client Connected")
    @client.onDisconnected =>
      @ink?.Result.invalidateAll()

    @client.handle 'progress', (p) =>
      @progress?.progress = p

  consumeInk: (@ink) ->
    @views.ink = @ink

    @client.onWorking => @progress = @ink.progress.push()
    @client.onDone => @progress?.destroy()
