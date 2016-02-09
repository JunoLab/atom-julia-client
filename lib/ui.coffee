module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'

  activate: (@client) ->
    @notifications.activate()
    @client.onConnected =>
      @notifications.show("Client Connected")

  deactivate: ->
    @spinner.dispose()

  consumeInk: (ink) ->
    @views.ink = ink

    @spinner = new ink.Spinner @client.loading
