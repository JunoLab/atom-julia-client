{client} = require '../connection'
{views} = require '../ui'

module.exports =
  activate: ->
    client.handle
      plot: (x) => @show x
      plotsize: => @plotSize()
    @create()

  create: ->
    @pane = @ink.PlotPane.fromId 'default'

  open: ->
    @pane.open split: 'right'

  ensureVisible: ->
    return Promise.resolve(@pane) if @pane.currentPane()
    @open()

  show: (view) ->
    @ensureVisible()
    @pane.show views.render view

  plotSize: ->
    @ensureVisible().then =>
      view = atom.views.getView @pane
      [view.clientWidth or 400, view.clientHeight or 300]
