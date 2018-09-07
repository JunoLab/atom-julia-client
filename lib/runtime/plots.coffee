{client} = require '../connection'
{views} = require '../ui'

{webview} = views.tags

module.exports =
  activate: ->
    client.handle
      plot: (x) => @show x
      plotsize: => @plotSize()
      ploturl: (url) => @ploturl url
      newpane: (id, url, opts) => @newpane(id, url, opts)
    @create()

  create: ->
    @pane = @ink.PlotPane.fromId 'default'

  open: ->
    @pane.open split: 'right'

  ensureVisible: ->
    @pane.ensureVisible({split: 'right'})

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
      disablewebsecurity: true,
      src: url,
      style: 'width: 100%; height: 100%'
    @ensureVisible()
    @pane.show v
    v.addEventListener('console-message', (e) => console.log(e.message))

  newpane: (id, url, opts) ->
    v = views.render webview
      class: 'blinkjl',
      disablewebsecurity: true,
      src: url,
      style: 'width: 100%; height: 100%'
    v.addEventListener('console-message', (e) => console.log(e.message))

    pane = @ink.HTMLPane.fromId(id, {
      item: v,
      icon: opts.icon || 'graph',
      title: opts.title || 'HTMLPane'
      })

    pane.ensureVisible({split: 'right'})
