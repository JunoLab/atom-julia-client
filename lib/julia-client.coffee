{CompositeDisposable} = require 'atom'
terminal = require './connection/terminal'
comm = require './connection/comm'

module.exports = JuliaClient =
  config:
    juliaPath:
      type: 'string'
      default: 'julia'
      description: 'The location of the Julia binary'

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @commands @subscriptions
    comm.activate()

  deactivate: ->
    @subscriptions.dispose()

  commands: (subs) ->
    @subscriptions.add atom.commands.add 'atom-text-editor',
      'julia-client:eval': (event) => @eval()

    @subscriptions.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': => terminal.repl()

    @subscriptions.add atom.commands.add 'atom-workspace',
      'julia-client:open-repl-client': => terminal.client comm.port

  eval: ->
    editor = atom.workspace.getActiveTextEditor()
    selection = editor.getSelectedText()
    return if selection == ""
    console.log selection
