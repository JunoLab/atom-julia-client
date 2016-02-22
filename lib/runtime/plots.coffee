module.exports =
  activate: ->
    @create()

  create: ->
    @pane = @ink.PlotPane.fromId 'default'

  open: ->
    @pane.activate() ||
      atom.workspace.open 'atom://ink/plots'
