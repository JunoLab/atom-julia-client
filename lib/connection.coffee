module.exports =
  client:   require './connection/client'
  process:  require './connection/process'
  tcp:      require './connection/tcp'
  terminal: require './connection/terminal'

  activate: ->
    @client.activate()
    @process.activate()

    if atom.config.get("julia-client.launchOnStartup")
      atom.commands.dispatch atom.views.getView(atom.workspace),
        'julia-client:start-julia'

  deactivate: ->
    @process.deactivate()

  consumeInk: (ink) ->
    @client.loading = new ink.Loading
