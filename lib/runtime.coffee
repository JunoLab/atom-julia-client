module.exports =
  modules:    require './runtime/modules'
  evaluation: require './runtime/evaluation'
  console:    require './runtime/console'
  workspace:  require './runtime/workspace'
  plots:      require './runtime/plots'
  frontend:   require './runtime/frontend'

  activate: ->
    @modules.activate()
    @frontend.activate()

  deactivate: ->
    mod.deactivate() for mod in [@modules, @console, @workspace, @plots, @frontend]

  consumeInk: (ink) ->
    @evaluation.ink = ink
    for mod in [@console, @workspace, @plots]
      mod.ink = ink
      mod.activate()

  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar
