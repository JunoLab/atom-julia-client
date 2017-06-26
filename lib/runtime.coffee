module.exports =
  completions: require './runtime/completions'
  modules:     require './runtime/modules'
  evaluation:  require './runtime/evaluation'
  console:     require './runtime/console'
  workspace:   require './runtime/workspace'
  plots:       require './runtime/plots'
  frontend:    require './runtime/frontend'
  debugger:    require './runtime/debugger'
  profiler:    require './runtime/profiler'

  activate: ->
    @modules.activate()
    @frontend.activate()
    @debugger.activate()

  deactivate: ->
    mod.deactivate() for mod in [@modules, @console, @frontend, @debugger, @profiler]

  consumeInk: (ink) ->
    @evaluation.ink = ink
    @debugger.consumeInk ink
    @profiler.activate ink
    for mod in [@console, @workspace, @plots]
      mod.ink = ink
      mod.activate()

  consumeHyperclick: ->
    e = @evaluation
    {
      wordRegExp:  /\b[\u00A0-\uFFFF\w_!´\.]*@?[\u00A0-\uFFFF\w_!´]+\b(?=\()/
      getSuggestionForWord: (editor, text, range) ->
        {
          range: range
          callback: => e.gotoSymbol(text, range)
        }
    }

  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar
