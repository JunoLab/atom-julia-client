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
    p = atom.workspace.getActivePane()
    prom = @open()
    prom.then(() => p.activate())
    prom

  show: (view) ->
    @ensureVisible()
    v = views.render view
    @pane.show new @ink.Pannable(v)
    v

  plotSize: ->
    @ensureVisible().then => @pane.size()

  ploturl: (url) ->
    v = views.render webview
      class: 'blinkjl',
      src: url,
      style: 'width: 100%; height: 100%'
    @ensureVisible()
    @pane.show v
    v.addEventListener('console-message', (e) => console.log(e.message))
