module.exports =
  modules:    require './runtime/modules'
  evaluation: require './runtime/evaluation'
  console:    require './runtime/console'
  frontend:   require './runtime/frontend'

  activate: ->
    @modules.activate()
    @frontend.activate()

  deactivate: ->
    @modules.deactivate()
    @console.deactivate()
    @frontend.deactivate()

  consumeInk: (ink) ->
    @evaluation.ink = ink
    @console.ink = ink
    @console.activate()

  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar
