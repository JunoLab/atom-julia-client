module.exports =
  modules:    require './runtime/modules'
  evaluation: require './runtime/evaluation'
  frontend:   require './runtime/frontend'

  activate: ->
    @modules.activate()
    @frontend.activate()

  deactivate: ->
    @modules.deactivate()

  consumeInk: (ink) ->
    @evaluation.ink = ink

  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar
