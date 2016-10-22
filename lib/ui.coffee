{CompositeDisposable} = require 'atom'
{formatTimePeriod} = require './misc'

module.exports =
  notifications: require './ui/notifications'
  selector:      require './ui/selector'
  views:         require './ui/views'

  activate: (@client) ->
    @subs = new CompositeDisposable

    @notifications.activate()

    @subs.add @client.onAttached =>
      @notifications.show("Client Connected")
    @subs.add @client.onDetached =>
      @ink?.Result.invalidateAll()

    t_0 = {}

    @client.handle 'progress!': (t, p) =>
      if t is 'add'
        t_0[p.id] = Date.now()
      else if t is 'update' and not p.rightText?.length
        p.rightText = formatTimePeriod (Date.now() - t_0[p.id])*(1/p.progress - 1)/1000
      else if t is 'delete'
        delete t_0[p.id]
      @ink.progress[t] p


  deactivate: ->
    @subs.dispose()
    @ink.progress.emptyStack()

  consumeInk: (@ink) ->
    @views.ink = @ink

    indetProg = @ink.progress.indeterminateProgress 'indetJuno'
    @subs.add @client.onWorking => @ink.progress.add indetProg
    @subs.add @client.onDone    => @ink.progress.emptyStack()
