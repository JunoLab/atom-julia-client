{client} = require '../connection'
{views} = require '../ui'

{webview} = views.tags

module.exports =
  activate: ->
    client.handle
      plot: (x) => @show x
      plotsize: => @plotSize()
      ploturl: (url) => @ploturl url
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
      view = atom.views.getView(@pane).querySelector('.fill')
      [view?.clientWidth or 400, view?.clientHeight or 300]

  ploturl: (url) ->
    @show webview
      class: 'blinkjl',
      src: url,
      style: 'width: 100%; height: 100%'
