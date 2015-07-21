{CompositeDisposable} = require 'atom'
terminal = require './connection/terminal'
comm = require './connection/comm'
modules = require './modules'
evaluation = require './eval'
notifications = require './notifications'

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
      'julia-client:evaluate': (event) => evaluation.eval()
      'julia-client:evaluate-all': (event) => evaluation.evalAll()

    subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': => terminal.repl()
      'julia-client:start-repl-client': =>
        return if comm.connectedError()
        comm.listen (port) -> terminal.client port

    subs.add atom.commands.add 'atom-text-editor[data-grammar="source julia"]:not([mini])',
      'julia-client:set-working-module': -> modules.chooseModule()
      'julia-client:reset-working-module': -> modules.resetModule()

  consumeStatusBar: (bar) -> modules.consumeStatusBar(bar)
