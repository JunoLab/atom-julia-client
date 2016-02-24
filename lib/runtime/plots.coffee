{client} = require '../connection'
{views} = require '../ui'

module.exports =
  activate: ->
    client.handle 'plot', (x) => @show x
    @create()

  create: ->
    @pane = @ink.PlotPane.fromId 'default'

  open: ->
    @pane.activate() ||
      atom.workspace.open 'atom://ink/plots',
        split: 'right'

  show: (view) ->
    if not @pane.currentPane()
      @open()
    @pane.show views.render view
