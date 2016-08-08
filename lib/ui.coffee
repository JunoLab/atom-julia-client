module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'
  notificator:   require './ui/notificator'

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
    @notificator.ink = @ink
    @notificator.activate()
    @client.onWorking => @progress = @ink.progress.push()
    @client.onDone => @progress?.destroy()
