{ CompositeDisposable, Disposable } = require 'atom'

module.exports =
  modules:      require './runtime/modules'
  environments: require './runtime/environments'
  evaluation:   require './runtime/evaluation'
  console:      require './runtime/console'
  completions:  require './runtime/completions'
  workspace:    require './runtime/workspace'
  plots:        require './runtime/plots'
  frontend:     require './runtime/frontend'
  debugger:     require './runtime/debugger'
  profiler:     require './runtime/profiler'
  outline:      require './runtime/outline'
  linter:       require './runtime/linter'
  packages:     require './runtime/packages'
  debuginfo:    require './runtime/debuginfo'
  formatter:    require './runtime/formatter'
  goto:         require './runtime/goto'

  activate: ->
    @subs = new CompositeDisposable()

    @modules.activate()
    @completions.activate()
    @subs.add atom.config.observe 'julia-client.juliaOptions.formatOnSave', (val) =>
      if val
        @formatter.activate()
      else
        @formatter.deactivate()

    @subs.add new Disposable(=>
      mod.deactivate() for mod in [@modules, @completions, @formatter])

  deactivate: ->
    @subs.dispose()

  consumeInk: (ink) ->
    @evaluation.ink = ink
    for mod in [@console, @debugger, @profiler, @linter, @goto, @outline, @frontend]
      mod.activate(ink)
    for mod in [@workspace, @plots]
      mod.ink = ink
      mod.activate()
    @subs.add new Disposable =>
      mod.deactivate() for mod in [@console, @debugger, @profiler, @linter, @goto, @outline]
    @environments.consumeInk(ink)

  provideAutoComplete: -> @completions

  provideHyperclick: -> @goto.provideHyperclick()

  consumeStatusBar: (bar) ->
    m = @modules.consumeStatusBar bar
    e = @environments.consumeStatusBar bar
    d = new Disposable =>
      m.dispose()
      e.dispose()
    @subs.add d
    return d

  consumeDatatip: (datatipService) ->
    datatipProvider = require './runtime/datatip'
    # @NOTE: Check if the service is passed by Atom-IDE-UI's datatip service:
    #          currently atom-ide-datatip can't render code snippets correctly.
    if datatipService.constructor.name == 'DatatipManager'
      datatipProvider.useAtomIDEUI = true
    else
      # @NOTE: Overwrite the weird default config settings of atom-ide-datatip
      atom.config.set 'atom-ide-datatip',
        showDataTipOnCursorMove: false
        showDataTipOnMouseMove: true
    datatipDisposable = datatipService.addProvider(datatipProvider)
    @subs.add(datatipDisposable)
    datatipDisposable

  handleURI: require './runtime/urihandler'
