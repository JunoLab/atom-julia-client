{CompositeDisposable} = require 'atom'

module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'
  progress:      require './ui/progress'


  activate: (@client) ->
    @subs = new CompositeDisposable

    @notifications.activate()

    @subs.add @client.onAttached =>
      @notifications.show("Client Connected")
    @subs.add @client.onDetached =>
      @ink?.Result.invalidateAll()

    @client.handle 'progress!': (t, p) => @progress[t] p

  deactivate: ->
    @subs.dispose()
    @progress.clear()

  consumeInk: (@ink) ->
    @views.ink = @ink
    @progress.ink = @ink

    @subs.add @client.onWorking => @progress.add progress: -1, id: 'indet'
    @subs.add @client.onDone => @progress.clear()
