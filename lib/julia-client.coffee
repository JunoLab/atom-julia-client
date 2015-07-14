JuliaClientView = require './julia-client-view'
{CompositeDisposable} = require 'atom'

module.exports = JuliaClient =
  juliaClientView: null
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @juliaClientView = new JuliaClientView(state.juliaClientViewState)
    @modalPanel = atom.workspace.addModalPanel(item: @juliaClientView.getElement(), visible: false)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'julia-client:toggle': => @toggle()

  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @juliaClientView.destroy()

  serialize: ->
    juliaClientViewState: @juliaClientView.serialize()

  toggle: ->
    console.log 'JuliaClient was toggled!'

    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()
