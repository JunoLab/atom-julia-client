module.exports =
  evaluation: require './runtime/evaluation'
  frontend:   require './runtime/frontend'
  modules:    require './runtime/modules'

  activate: ->
    @modules.activate()
    @frontend.activate()

  deactivate: ->
    @modules.deactivate()

  consumeInk: (ink) ->
    @evaluation.ink = ink

  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar
