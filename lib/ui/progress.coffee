{CompositeDisposable} = require 'atom'
{client} = require '../connection'
{formatTimePeriod} = require '../misc'

module.exports =
  progs: {}

  activate: (ink) ->
    @subs = new CompositeDisposable
    @ink = ink
    client.handle 'progress': (t, id, m) => @[t] id, m
    status = []
    @subs.add(
      client.onWorking  =>
        status = @ink.progress.add(null, description: 'Julia')
      client.onDone     => status?.destroy()
      client.onAttached => @ink.progress.show()
      client.onDetached => @clear()
    )

  deactivate: ->
    @clear()
    @subs.dispose()

  add: (id) ->
    pr = @ink.progress.add()
    pr.t0 = Date.now()
    pr.showTime = true
    @progs[id] = pr

  progress: (id, prog) ->
    pr = @progs[id]
    return unless pr?
    pr.level = prog
    if pr.showTime then @rightText id, null

  message:  (id, m) -> @progs[id]?.message = m

  leftText: (id, m) -> @progs[id]?.description = m

  rightText: (id, m) ->
    pr = @progs[id]
    return unless pr?
    if m?.length
      pr.rightText = m
      pr.showTime = false
    else
      dt = (Date.now() - pr.t0)*(1/pr.level - 1)/1000
      pr.showTime = true
      pr.rightText = formatTimePeriod dt

  delete: (id) ->
    pr = @progs[id]
    return unless pr?
    pr.destroy()
    delete @progs[id]

  clear: ->
    for _, p of @progs
      p?.destroy()
    @progs = {}
    @ink.progress.hide()
