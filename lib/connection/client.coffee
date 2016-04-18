{Emitter} = require 'atom'

module.exports =

  # Messaging

  handlers: {}
  callbacks: {}
  queue: []
  id: 0

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

  activate: ->
    @handle 'cb', (id, result) =>
      try
        @callbacks[id]?.resolve result
      finally
        delete @callbacks[id]
        @loading.done()

    @handle 'cancelCallback', (id) =>
      @callbacks[id].reject "cancelled by julia"
      @loading.done()

  # Will be replaced by the connection logic
  output: (data) ->

  msg: (type, args...) ->
    if @isConnected()
      @output [type, args...]
    else
      @queue.push [type, args...]

  rpc: (type, args...) ->
    new Promise (resolve, reject) =>
      @id = @id+1
      @callbacks[@id] = {resolve, reject}
      @msg {type: type, callback: @id}, args...
      @loading.working()

  handle: (type, f) ->
    @handlers[type] = f

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

  # Connecting & Booting

  emitter: new Emitter()

  onConnected: (cb) -> @emitter.on('connected', cb)
  onDisconnected: (cb) -> @emitter.on('disconnected', cb)

  isBooting: false

  isConnected: -> false

  isActive: -> @isConnected() || @isBooting

  connected: ->
    @emitter.emit 'connected'
    if @isBooting
      @isBooting = false
      @loading.done()
    @output msg for msg in @queue
    @queue = []

  disconnected: ->
    @emitter.emit 'disconnected'
    @reset()

  booting: ->
    @isBooting = true
    @loading.working()

  cancelBoot: ->
    if @isBooting
      @isBooting = false
      @reset()

  reset: ->
    @cancelBoot()
    @loading.reset()
    @queue = []
    cb.reject 'client disconnected' for id, cb of @callbacks
    @callbacks = {}

  isWorking: -> @loading.isWorking()
  onWorking: (f) -> @loading.onWorking f
  onDone: (f) -> @loading.onDone f

  # Management & UI

  connectedError: ->
    if @isActive()
      atom.notifications.addError "Can't start a Julia process.",
        detail: "There is already a Julia client running."
      true
    else
      false

  notConnectedError: ->
    if not @isActive()
      atom.notifications.addError "Can't do that without a Julia client.",
        detail: "Try connecting a client by evaluating something."
      true
    else
      false

  require: (f) -> @notConnectedError() or f()
  disrequire: (f) -> @connectedError() or f()
