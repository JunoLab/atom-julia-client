{CompositeDisposable} = require 'atom'

module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'
  progress:      require './ui/progress'
  layout:        require './ui/layout'
  docpane:       require './ui/docs'
  focusutils:    require './ui/focusutils'

  activate: (@client) ->
    @subs = new CompositeDisposable

    @notifications.activate()

    @subs.add @client.onAttached =>
      @notifications.show("Client Connected")
    @subs.add @client.onDetached =>
      @ink?.Result.invalidateAll()

  deactivate: ->
    @subs.dispose()
    @docpane.deactivate()
    @focusutils.deactivate()
    @progress.clear()

  consumeInk: (@ink) ->
    @views.ink = @ink
    @selector.ink = @ink
    @progress.ink = @ink
    @docpane.activate(@ink)
    @progress.activate()
    @focusutils.activate(@ink)

  consumeDatatip: (datatipService) ->
    datatipProvider = require './ui/datatip-provider'
    # @NOTE: Currently only the datatip service provided by Atom-IDE-UI can render code snippets correctly
    if datatipService.constructor.name == 'DatatipManager'
      datatipProvider.useAtomIDEUI = true
    datatipDisposable = datatipService.addProvider(datatipProvider)
    @subs.add(datatipDisposable)
    datatipDisposable
