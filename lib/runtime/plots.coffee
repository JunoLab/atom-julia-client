{client} = require '../connection'
{views} = require '../ui'

module.exports =
  activate: ->
    client.handle 'plot', (x) => @show x
    client.handle 'plotsize', => @plotSize()
    @create()

  create: ->
    @pane = @ink.PlotPane.fromId 'default'

  open: ->
    @pane.open split: 'right'

  show: (view) ->
    if not @pane.currentPane()
      @open()
    @pane.show views.render view

  plotSize: ->
    view = atom.views.getView @pane
    [view.clientWidth or 400, view.clientHeight or 300]
