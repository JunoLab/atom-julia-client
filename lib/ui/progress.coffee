{CompositeDisposable} = require 'atom'
{client} = require '../connection'
{formatTimePeriod} = require '../misc'

module.exports =
  progs: {}

  activate: ->
    @subs = new CompositeDisposable
    client.handle 'progress': (t, p, m) => @[t] p, m
    status = []
    @subs.add client.onWorking  =>
        status = @ink?.progress.add(null, description: 'Julia')
    @subs.add client.onDone     => status?.destroy()
    @subs.add client.onDetached => @clear()

  deactivate: ->
    @subs.dispose()

  add: ({id}) ->
    pr = @ink.progress.add()
    pr.t0 = Date.now()
    pr.showTime = true
    @progs[id] = pr

  progress: (p, prog) ->
    pr = @progs[p.id]
    return unless pr?
    pr.level = prog
    if pr.showTime then @rightText p

  message:  (p, m) -> @progs[p.id]?.message = m

  leftText: (p, m) -> @progs[p.id]?.description = m

  rightText: (p, m) ->
    pr = @progs[p.id]
    return unless pr?
    if m?.length
      pr.rightText = m
      pr.showTime = false
    else
      dt = (Date.now() - pr.t0)*(1/pr.level - 1)/1000
      pr.showTime = true
      pr.rightText = formatTimePeriod dt

  delete: (p) ->
    pr = @progs[p.id]
    return unless pr?
    pr.destroy()
    delete @progs[p.id]

  clear: ->
    for _, p of @progs
      p?.destroy()
    @progs = {}
