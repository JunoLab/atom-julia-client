module.exports =
  modules:     require './runtime/modules'
  evaluation:  require './runtime/evaluation'
  console:     require './runtime/console'
  console2:    require './runtime/console2'
  workspace:   require './runtime/workspace'
  plots:       require './runtime/plots'
  frontend:    require './runtime/frontend'
  debugger:    require './runtime/debugger'
  profiler:    require './runtime/profiler'
  linter:      require './runtime/linter'
  packages:    require './runtime/packages'
  debuginfo:   require './runtime/debuginfo'
  formatter:   require './runtime/formatter'

  activate: ->
    @modules.activate()
    @frontend.activate()

  deactivate: ->
    mod.deactivate() for mod in [@modules, @console, @frontend, @debugger, @profiler, @console2, @linter]

  consumeInk: (ink) ->
    @evaluation.ink = ink
    @frontend.ink = ink
    @profiler.activate ink
    @debugger.activate ink
    @console2.activate ink
    @linter.activate ink
    for mod in [@console, @workspace, @plots]
      mod.ink = ink
      mod.activate()

  provideAutoComplete: ->
    require './runtime/completions'

  provideHyperclick: -> @evaluation.provideHyperclick()
  
  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar
