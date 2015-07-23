{CompositeDisposable} = require 'atom'
terminal = require './connection/terminal'
comm = require './connection/comm'
modules = require './modules'
evaluation = require './eval'
notifications = require './notifications'
utils = require './utils'
completions = require './completions'

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

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @commands @subscriptions
    comm.activate()
    modules.activate()
    notifications.activate()
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
        @ink?.reset()
        comm.isBooting = false

    subs.add atom.commands.add 'atom-text-editor[data-grammar="source julia"]:not([mini])',
      'julia-client:set-working-module': -> modules.chooseModule()
      'julia-client:reset-working-module': -> modules.resetModule()

    utils.commands subs

  consumeInk: (ink) ->
    @ink = ink
    comm.ink = ink
    comm.handle 'show-block', ({start, end}) =>
      ink.highlight atom.workspace.getActiveTextEditor(), start-1, end-1

  consumeStatusBar: (bar) -> modules.consumeStatusBar(bar)

  completions: -> completions
