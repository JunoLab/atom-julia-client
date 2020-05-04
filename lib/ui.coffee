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
    @subs.add atom.config.observe 'julia-client.uiOptions.highlightCells', (val) =>
      if val
        @cellhighlighter.activate()
      else
        @cellhighlighter.deactivate()
    @subs.add new Disposable =>
      @cellhighlighter.deactivate()

    @subs.add @client.onAttached =>
      @notifications.show("Client Connected")
    @subs.add @client.onDetached =>
      @ink?.Result.invalidateAll()

  deactivate: ->
    @subs.dispose()

  consumeInk: (@ink) ->
    @views.ink = @ink
    @selector.activate(@ink)
    @docpane.activate(@ink)
    @progress.activate(@ink)
    @focusutils.activate(@ink)
    @subs.add(new Disposable(=>
      @docpane.deactivate()
      @progress.deactivate()
      @focusutils.deactivate()))
