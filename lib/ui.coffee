{CompositeDisposable, Disposable} = require 'atom'

module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'
  progress:      require './ui/progress'
  layout:        require './ui/layout'
  docpane:       require './ui/docs'
  focusutils:    require './ui/focusutils'
  cellhighlighter:    require './ui/cellhighlighter'

  activate: (@client) ->
    @subs = new CompositeDisposable

    @notifications.activate()
    @cellhighlighter.activate()

    @subs.add @client.onAttached =>
      @notifications.show("Client Connected")
    @subs.add @client.onDetached =>
      @ink?.Result.invalidateAll()

  deactivate: ->
    @subs.dispose()
    @cellhighlighter.deactivate()

  consumeInk: (@ink) ->
    @views.ink = @ink
    @selector.ink = @ink
    @progress.ink = @ink
    @docpane.activate(@ink)
    @progress.activate()
    @focusutils.activate(@ink)
    @subs.add(new Disposable(=>
      @docpane.deactivate()
      @progress.deactivate()
      @focusutils.deactivate()))
