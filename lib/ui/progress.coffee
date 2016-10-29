{formatTimePeriod} = require '../misc'

module.exports =
  progs: []

  add: (p) ->
    pr = @ink.progress.create p
    pr.register()
    pr.t0 = Date.now()
    @progs.push pr

  update: (p) ->
    pr = @progs.find (pr) => pr.id is p.id
    pr.setProgress p.progress
    pr.setLeftText p.leftText
    if p.rightText?.length
      pr.setRightText p.rightText
    else
      pr.setRightText formatTimePeriod (Date.now() - pr.t0)*(1/p.progress - 1)/1000
    pr.setMessage p.msg

  delete: (p) ->
    i = @progs.findIndex (pr) => pr.id is p.id
    @progs[i].destroy()
    @progs.splice i, 1

  clear: ->
    for p in @progs
      p.destroy()
    @progs = []
