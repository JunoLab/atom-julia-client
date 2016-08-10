{time} = require './misc'

module.exports =
  IPC:      require './connection/ipc'
  messages: require './connection/messages'
  client:   require './connection/client'
  local:    require './connection/local'
  terminal: require './connection/terminal'

  activate: ->
    @messages.activate()
    @client.activate()
    @client.boot = => @boot()
    @local.activate()

  deactivate: ->

  consumeInk: (ink) ->
    @IPC.consumeInk ink

  boot: ->
    if not @client.isActive()
      @local.start()
      time "Julia Boot", @client.import('ping')()
