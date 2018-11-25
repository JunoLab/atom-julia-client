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
    @booting = false

  deactivate: ->
    @client.deactivate()

  consumeInk: (ink) ->
    @IPC.consumeInk ink
    @ink = ink

  consumeTerminal: (term) ->
    @terminal.consumeTerminal term

  consumeGetServerConfig: (getconf) ->
    @local.consumeGetServerConfig(getconf)

  consumeGetServerName: (name) ->
    @local.consumeGetServerName(name)

  boot: ->
    if not @client.isActive() and not @booting
      @booting = true
      p = @local.start()
      if @ink?
        @ink.Opener.allowRemoteFiles(atom.config.get('julia-client.juliaOptions.bootMode') is 'Remote')
      p.then =>
        @booting = false
      p.catch =>
        @booting = false
      time "Julia Boot", @client.import('ping')().then =>
        metrics()
