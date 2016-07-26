Loading = null
lwaits = []
withLoading = (f) -> if Loading? then f() else lwaits.push f

module.exports =
class IPC

  @consumeInk: (ink) ->
    Loading = ink.Loading
    f() for f in lwaits

  constructor: ->
    withLoading =>
      @loading = new Loading
    @handlers = {}
    @callbacks = {}
    @queue = []
    @id = 0

    @handle 'cb', (id, result) =>
      @callbacks[id]?.resolve result
      delete @callbacks[id]

    @handle 'cancelCallback', (id, e) =>
      @callbacks[id].reject e

  handle: (type, f) ->
    @handlers[type] = f

  writeMsg: -> throw new Error 'msg not implemented'

  msg: (type, args...) -> @writeMsg [type, args...]

  rpc: (type, args...) ->
    x = new Promise (resolve, reject) =>
      @id += 1
      @callbacks[@id] = {resolve, reject}
      @msg {type, callback: @id}, args...
    @loading.working()
    done = => @loading.done()
    x.then done, done
    x

  flush: ->
    @writeMsg msg for msg in @queue
    @queue = []

  reset: ->
    @loading.reset()
    @queue = []
    cb.reject 'disconnected' for id, cb of @callbacks
    @callbacks = {}

  input: ([type, args...]) ->
    if type.constructor == Object
      {type, callback} = type
    if @handlers.hasOwnProperty type
      result = @handlers[type] args...
      if callback
        Promise.resolve(result).then (result) =>
          @msg 'cb', callback, result
    else
      console.log "julia-client: unrecognised message #{type}"
      console.log args

  import: (fs, rpc = true, mod = {}) ->
    return unless fs?
    if fs.constructor == String then return @import [fs], rpc, mod
    if fs.rpc? or fs.msg?
      mod = {}
      @import fs.rpc, true,  mod
      @import fs.msg, false, mod
    else
      fs.forEach (f) =>
        mod[f] = (args...) =>
          if rpc then @rpc f, args... else @msg f, args...
    mod

  isWorking: -> @loading.isWorking()
  onWorking: (f) -> @loading.onWorking f
  onDone: (f) -> @loading.onDone f
  onceDone: (f) -> @loading.onceDone f
