{CompositeDisposable} = require 'atom'
terminal = require './connection/terminal'
comm = require './connection/comm'
modules = require './modules'

module.exports = JuliaClient =
  config:
    juliaPath:
      type: 'string'
      default: 'julia'
      description: 'The location of the Julia binary'

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @commands @subscriptions
    modules.activate()

  deactivate: ->
    @subscriptions.dispose()
    modules.deactivate()

  commands: (subs) ->
    subs.add atom.commands.add 'atom-text-editor',
      'julia-client:eval': (event) => @eval()

    subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': => terminal.repl()

    subs.add atom.commands.add 'atom-workspace',
      'julia-client:start-repl-client': =>
        return if comm.connectedError()
        comm.listen (port) -> terminal.client port

  consumeStatusBar: (bar) -> modules.consumeStatusBar(bar)

  eval: ->
    editor = atom.workspace.getActiveTextEditor()
    for cursor in editor.getCursors()
      {row, column} = cursor.getScreenPosition()
      comm.msg 'eval-block', {row: row+1, column: column+1, code: editor.getText()}
