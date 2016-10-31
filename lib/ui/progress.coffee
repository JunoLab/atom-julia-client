{formatTimePeriod} = require '../misc'

module.exports =
  progs: {}

  add: (p) ->
    pr = @ink.progress.create p
    pr.register()
    pr.t0 = Date.now()
    @progs[pr.id] = pr

  update: (p) ->
    pr = @progs[p.id]
    return unless pr?
    pr.setProgress if p.progress >= 0 then p.progress else null
    pr.setLeftText p.leftText
    if p.rightText?.length
      pr.setRightText p.rightText
    else
      pr.setRightText formatTimePeriod (Date.now() - pr.t0)*(1/p.progress - 1)/1000
    pr.setMessage p.msg

  delete: (p) ->
    pr = @progs[p.id]
    return unless pr?
    pr.destroy()
    delete @progs[p.id]

  clear: ->
    for _, p of @progs
      p?.destroy()
    @progs = {}
