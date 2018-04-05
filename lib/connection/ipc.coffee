Loading = null
lwaits = []
withLoading = (f) -> if Loading? then f() else lwaits.push f

{bufferLines} = require '../misc'

module.exports =
class IPC

  @consumeInk: (ink) ->
    Loading = ink.Loading
    f() for f in lwaits

  constructor: (stream) ->
    withLoading =>
      @loading = new Loading
    @handlers = {}
    @callbacks = {}
    @queue = []
    @id = 0

    if stream? then @setStream stream

    @handle
      cb: (id, result) =>
        @callbacks[id]?.resolve result
        delete @callbacks[id]

      cancelCallback: (id, e) =>
        @callbacks[id].reject e

  handle: (type, f) ->
    if f?
      @handlers[type] = f
    else
      @handle t, f for t, f of type

  writeMsg: -> throw new Error 'msg not implemented'

  msg: (type, args...) -> @writeMsg [type, args...]

  rpc: (type, args...) ->
    p = new Promise (resolve, reject) =>
      @id += 1
      @callbacks[@id] = {resolve, reject}
      @msg {type, callback: @id}, args...
    @loading?.monitor p

  flush: ->
    @writeMsg msg for msg in @queue
    @queue = []

  reset: ->
    @loading?.reset()
    @queue = []
    cb.reject 'disconnected' for id, cb of @callbacks
    @callbacks = {}

  input: ([type, args...]) ->
    if type.constructor == Object
      {type, callback} = type
    if @handlers.hasOwnProperty type
      result = Promise.resolve().then => @handlers[type] args...
      if callback
        result
          .then (result) => @msg 'cb', callback, result
          .catch (err) =>
            console.error(err)
            @msg 'cancelCallback', callback, @errJson err
    else
      console.log "julia-client: unrecognised message #{type}", args

  import: (fs, rpc = true, mod = {}) ->
    return unless fs?
    if fs.constructor == String then return @import([fs], rpc, mod)[fs]
    if fs.rpc? or fs.msg?
      mod = {}
      @import fs.rpc, true,  mod
      @import fs.msg, false, mod
    else
      fs.forEach (f) =>
        mod[f] = (args...) =>
          if rpc then @rpc f, args... else @msg f, args...
    mod

  isWorking: -> @loading?.isWorking()
  onWorking: (f) -> @loading?.onWorking f
  onDone: (f) -> @loading?.onDone f
  onceDone: (f) -> @loading?.onceDone f

  errJson: (obj) ->
    return unless obj instanceof Error
    {type: 'error', message: obj.message, stack: obj.stack}

  readStream: (s) ->
    s.on 'data', cb = bufferLines (m) => if m then @input JSON.parse m
    @unreadStream = -> s.removeListener 'data', cb

  writeStream: (s) ->
    @writeMsg = (m) ->
      s.write JSON.stringify m
      s.write '\n'

  setStream: (@stream) ->
    @readStream @stream
    @writeStream @stream
    @stream.on 'end', => @reset()
