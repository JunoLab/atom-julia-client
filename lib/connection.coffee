{time} = require './misc'

module.exports =
  messages: require './connection/messages'
  client:   require './connection/client'
  local:  require './connection/local'
  tcp:      require './connection/tcp'
  terminal: require './connection/terminal'

  activate: ->
    @messages.activate()
    @client.activate()
    @client.boot = => @boot()
    @local.activate()

  deactivate: ->

  consumeInk: (ink) ->
    @client.loading = new ink.Loading

  boot: ->
    if not @client.isActive()
      @local.start()
      time "Julia Boot", @client.rpc 'ping'
