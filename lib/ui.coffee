module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'
  console:       require './ui/console'

  activate: (@client) ->
    @notifications.activate()
    @client.onConnected =>
      @notifications.show("Client Connected")

  deactivate: ->
    @console.deactivate()
    @spinner.dispose()

  consumeInk: (ink) ->
    @console.ink = ink
    @console.activate @client

    @views.ink = ink

    @spinner = new ink.Spinner @client.loading

    @client.handle 'show-block', ({start, end}) ->
      if ed = atom.workspace.getActiveTextEditor()
        ink.highlight ed, start-1, end-1
