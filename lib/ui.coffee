{CompositeDisposable} = require 'atom'

module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'

  activate: (@client) ->
    @subs = new CompositeDisposable

    @notifications.activate()

    @subs.add @client.onConnected =>
      @notifications.show("Client Connected")
    @subs.add @client.onDisconnected =>
      @ink?.Result.invalidateAll()

    @client.handle progress: (p) =>
      @progress?.progress = p

  deactivate: ->
    @subs.dispose()

  consumeInk: (@ink) ->
    @views.ink = @ink

    @subs.add @client.onWorking => @progress = @ink.progress.push()
    @subs.add @client.onDone => @progress?.destroy()
