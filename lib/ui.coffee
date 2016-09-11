{CompositeDisposable} = require 'atom'

module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'

  activate: (@client) ->
    @subs = new CompositeDisposable

    @notifications.activate()

    @subs.add @client.onAttached =>
      @notifications.show("Client Connected")
    @subs.add @client.onDetached =>
      @ink?.Result.invalidateAll()

    @client.handle progress: (p, t, f, l) => @progress?.update p, t, f, l

  deactivate: ->
    @progress.destroy()
    @subs.dispose()

  consumeInk: (@ink) ->
    @views.ink = @ink

    @subs.add @client.onWorking =>
      if @progress?
        @progress.update 'indeterminate', ''
      else
        @progress = @ink.progress.create()
    @subs.add @client.onDone => @progress?.update 0, ''
