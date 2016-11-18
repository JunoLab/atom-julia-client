{formatTimePeriod} = require '../misc'

module.exports =
  progs: {}

  add: (p) ->
    pr = @ink.progress.create p
    pr.register()
    pr.t0 = Date.now()
    pr.showTime = true
    @progs[pr.id] = pr

  progress: (p, prog) ->
    pr = @progs[p.id]
    return unless pr?
    pr.setProgress prog
    if pr.showTime then @rightText pr

  message:  (p, m) -> @progs[p.id]?.setMessage  m

  leftText: (p, m) -> @progs[p.id]?.setLeftText m

  rightText: (p, m) ->
    pr = @progs[p.id]
    return unless pr?
    if m?.length
      pr.setRightText m
      pr.showTime = false
    else
      dt = (Date.now() - pr.t0)*(1/pr.level - 1)/1000
      pr.showTime = true
      pr.setRightText formatTimePeriod dt

  delete: (p) ->
    pr = @progs[p.id]
    return unless pr?
    pr.destroy()
    delete @progs[p.id]

  clear: ->
    for _, p of @progs
      p?.destroy()
    @progs = {}
