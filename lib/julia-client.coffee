{CompositeDisposable} = require 'atom'
terminal = require './connection/terminal'
comm = require './connection/comm'
modules = require './modules'
evaluation = require './eval'
notifications = require './ui/notifications'
utils = require './utils'
completions = require './completions'
frontend = require './frontend'

defaultTerminal =
  switch process.platform
    when 'darwin'
      'Terminal.app'
    when 'linux'
      'x-terminal-emulator -e'
    else
      'cmd /C start cmd /C'

module.exports = JuliaClient =
  config:
    juliaPath:
      type: 'string'
      default: 'julia'
      description: 'The location of the Julia binary'
    juliaArguments:
      type: 'string'
      default: '-q'
      description: 'Command-line arguments to pass to Julia'
    notifications:
      type: 'boolean'
      default: true
      description: 'Enable notifications for evaluation'
    terminal:
      type: 'string'
      default: defaultTerminal
      description: 'Command used to open a terminal. (Windows/Linux only)'

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @commands @subscriptions
    comm.activate()
    modules.activate()
    notifications.activate()
    frontend.activate()
    comm.onConnected =>
      notifications.show("Client Connected")

  deactivate: ->
    @subscriptions.dispose()
    modules.deactivate()

  commands: (subs) ->
    subs.add atom.commands.add 'atom-text-editor',
      'julia-client:evaluate': (event) =>
        comm.withClient => evaluation.eval()
      'julia-client:evaluate-all': (event) =>
        comm.withClient => evaluation.evalAll()

    subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': => terminal.repl()
      'julia-client:start-repl-client': =>
        comm.requireNoClient =>
          comm.listen (port) => terminal.client port
      'julia-client:reset-loading-indicator': =>
        @ink?.loading.reset()
        comm.isBooting = false

    subs.add atom.commands.add 'atom-text-editor[data-grammar="source julia"]:not([mini])',
      'julia-client:set-working-module': => modules.chooseModule()
      'julia-client:reset-working-module': => modules.resetModule()
      'julia-client:clear-inline-results': => @ink?.results.removeAll()

    utils.commands subs

  consumeInk: (ink) ->
    @ink = ink
    evaluation.ink = ink
    comm.loading = ink.loading
    comm.handle 'show-block', ({start, end}) =>
      ink.highlight atom.workspace.getActiveTextEditor(), start-1, end-1

  consumeStatusBar: (bar) -> modules.consumeStatusBar(bar)

  completions: -> completions
