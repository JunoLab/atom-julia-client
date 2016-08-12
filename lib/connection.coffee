{time} = require './misc'

metrics = ->
  if id = localStorage.getItem 'metrics.userId'
    r = require('http').get "http://data.junolab.org/hit?id=#{id}&app=atom-julia-boot"
    r.on 'error', ->

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
    @client.deactivate()

  consumeInk: (ink) ->
    @IPC.consumeInk ink

  boot: ->
    if not @client.isActive()
      @local.start()
      time "Julia Boot", @client.import('ping')().then ->
        metrics()
