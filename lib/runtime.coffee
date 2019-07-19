{ CompositeDisposable, Disposable } = require 'atom'

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
  goto:        require './runtime/goto'

  activate: ->
    @subs = new CompositeDisposable()
    @modules.activate()
    @frontend.activate()
    @subs.add new Disposable(=>
      mod.deactivate() for mod in [@modules, @frontend])

  deactivate: ->
    @subs.dispose()

  consumeInk: (ink) ->
    @evaluation.ink = ink
    @frontend.ink = ink
    @profiler.activate ink
    @debugger.activate ink
    @console2.activate ink
    @linter.activate ink
    @goto.activate ink
    for mod in [@console, @workspace, @plots]
      mod.ink = ink
      mod.activate()
    @subs.add new Disposable(=>
      mod.deactivate() for mod in [@console, @debugger, @profiler, @console2, @linter])

  provideAutoComplete: ->
    require './runtime/completions'

  provideHyperclick: -> @evaluation.provideHyperclick()
  
  consumeStatusBar: (bar) ->
    @modules.consumeStatusBar bar

  consumeDatatip: (datatipService) ->
    datatipProvider = require './runtime/datatip'
    # @NOTE: Check if the service is passed by Atom-IDE-UI's datatip service:
    #          currently atom-ide-datatip can't render code snippets correctly.
    if datatipService.constructor.name == 'DatatipManager'
      datatipProvider.useAtomIDEUI = true
    datatipDisposable = datatipService.addProvider(datatipProvider)
    @subs.add(datatipDisposable)
    datatipDisposable
