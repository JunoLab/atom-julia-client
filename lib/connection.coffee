{time} = require './misc'

module.exports =
  messages: require './connection/messages'
  client:   require './connection/client'
  process:  require './connection/process'
  tcp:      require './connection/tcp'
  terminal: require './connection/terminal'

  activate: ->
    @messages.activate()
    @client.activate()
    @client.boot = => @boot()
    @process.activate()

  deactivate: ->

  consumeInk: (ink) ->
    @client.loading = new ink.Loading

  boot: ->
    if not @client.isActive()
      @tcp.listen (port) => @process.start port
      time "Julia Boot", @client.rpc 'ping'
