{time} = require './misc'

module.exports =
  client:   require './connection/client'
  process:  require './connection/process'
  tcp:      require './connection/tcp'
  terminal: require './connection/terminal'

  activate: ->
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
