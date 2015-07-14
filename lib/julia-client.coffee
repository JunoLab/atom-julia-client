{CompositeDisposable} = require 'atom'
terminal = require './connection/terminal'

module.exports = JuliaClient =
  config:
    juliaPath:
      type: 'string'
      default: 'julia'
      description: 'The location of the Julia binary'

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @commands(@subscriptions)
    terminal.commands(@subscriptions)

  deactivate: ->
    @subscriptions.dispose()

  commands: (subs) ->
    @subscriptions.add atom.commands.add 'atom-text-editor',
      'julia-client:eval': (event) => @eval(event)

  eval: (event) ->
    editor = atom.workspace.getActiveTextEditor()
    selection = editor.getSelectedText()
    return if selection == ""
    console.log selection
