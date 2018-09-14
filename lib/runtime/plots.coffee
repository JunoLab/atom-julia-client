{client} = require '../connection'
{views} = require '../ui'

{webview} = views.tags

consoleLog = (e) ->
  if e.level is 0
    log = console.log
  else if e.level is 1
    log = console.warn
  else if e.level is 2
    log = console.error
  log(e.message, "\nat #{e.sourceID}:#{e.line}")

module.exports =
  activate: ->
    client.handle
      plot: (x) => @show x
      plotsize: => @plotSize()
      ploturl: (url) => @ploturl url
      jlpane: (id, opts) => @jlpane(id, opts)
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
    v.addEventListener('console-message', (e) => consoleLog(e))

  jlpane: (id, opts={}) ->
    v = undefined
    if opts.url
      v = views.render webview
        class: 'blinkjl',
        disablewebsecurity: true,
        src: opts.url,
        style: 'width: 100%; height: 100%'
      v.addEventListener('console-message', (e) => consoleLog(e))

    pane = @ink.HTMLPane.fromId(id)

    if opts.close
      pane.close()
    else
      pane.show({
        item: v,
        icon: opts.icon,
        title: opts.title
        })

      pane.ensureVisible({
        split: opts.split || 'right'
        })
