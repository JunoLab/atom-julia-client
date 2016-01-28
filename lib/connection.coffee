module.exports =
  client:   require './connection/client'
  process:  require './connection/process'
  tcp:      require './connection/tcp'
  terminal: require './connection/terminal'

  activate: ->
    @client.activate()
    @client.boot = => @boot()
    @process.activate()

    @client.handle 'error', (options) =>
      atom.notifications.addError options.msg, options

    if atom.config.get("julia-client.launchOnStartup")
      atom.commands.dispatch atom.views.getView(atom.workspace),
        'julia-client:start-julia'

  deactivate: ->
    @process.deactivate()

  consumeInk: (ink) ->
    @client.loading = new ink.Loading

  boot: ->
    if not @client.isActive()
      @tcp.listen (port) => @process.start port
