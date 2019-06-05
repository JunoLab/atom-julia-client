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

    atom.config.observe 'julia-client.uiOptions.usePlotPane', (enabled) =>
      if enabled
        @pane.setTitle 'Plots'
      else
        @pane.setTitle 'Plots (disabled)'

    atom.config.observe 'julia-client.uiOptions.layouts.plotPane.defaultLocation', (defaultLocation) =>
      @pane.setDefaultLocation defaultLocation

  create: ->
    @pane = @ink.PlotPane.fromId 'default'

  open: ->
    @pane.open
      split: atom.config.get('julia-client.uiOptions.layouts.plotPane.split')

  ensureVisible: ->
    @pane.ensureVisible({ split: atom.config.get('julia-client.uiOptions.layouts.plotPane.split') })

  show: (view) ->
    @ensureVisible()
    v = views.render view
    @pane.show new @ink.Pannable(v)
    v

  plotSize: ->
    @ensureVisible().then => @pane.size()

  webview: (url) ->
    v = views.render webview
      class: 'blinkjl',
      src: url,
      style: 'width: 100%; height: 100%'
    v.classList.add('native-key-bindings')
    v.addEventListener('console-message', (e) => consoleLog(e))
    v

  ploturl: (url) ->
    v = @webview(url)
    @ensureVisible()
    @pane.show v

  jlpane: (id, opts={}) ->
    v = undefined
    if opts.url
      v = @webview(opts.url)
      if opts.devtools
        v.addEventListener 'dom-ready', () =>
          v.openDevTools()

    pane = @ink.HTMLPane.fromId(id)

    if opts.close
      pane.close()
    else if opts.destroy
      if pane.closeAndDestroy
        pane.closeAndDestroy()
    else
      pane.show({
        item: v,
        icon: opts.icon,
        title: opts.title
        })

      pane.ensureVisible({
        split: opts.split || 'right'
        })
