{Emitter} = require 'atom'

module.exports =

  # Messaging

  handlers: {}
  callbacks: {}
  queue: []
  id: 0

  unwrapPromise: (x, f) ->
    if x?.constructor is Promise
      x.then (x) => @unwrapPromise x, f
    else
      f x

  input: ([type, args...]) ->
    if type.constructor == Object
      {type, callback} = type
    if @handlers.hasOwnProperty type
      result = @handlers[type] args...
      if callback
        @unwrapPromise result, (result) =>
          @msg 'cb', callback, result
    else
      console.log "julia-client: unrecognised message #{type}"
      console.log args

  activate: ->
    @handle 'cb', (id, result) =>
      try
        @callbacks[id] result
      finally
        delete @callbacks[id]
        @loading.done()

    @handle 'cancelCallback', (id) =>
      delete @callbacks[id]
      @loading.done()

  # Will be replaced by the connection logic
  output: (data) ->

  msg: (type, args...) ->
    if @isConnected()
      @output [type, args...]
    else
      @queue.push [type, args...]

  rpc: (type, args...) ->
    new Promise (resolve) =>
      @id = @id+1
      @callbacks[@id] = resolve
      @msg {type: type, callback: @id}, args...
      @loading.working()

  handle: (type, f) ->
    @handlers[type] = f

  import: (fs, rpc = false, mod = {}) ->
    return unless fs?
    if fs.rpc? or fs.msg?
      mod = {}
      @import fs.rpc, true,  mod
      @import fs.msg, false, mod
    else
      for f in fs
        do (f) =>
          mod[f] = (args...) =>
            if rpc then @rpc f, args... else @msg f, args...
    mod

  # Connecting & Booting

  emitter: new Emitter()

  onConnected: (cb) -> @emitter.on('connected', cb)
  onDisconnected: (cb) -> @emitter.on('disconnected', cb)

  isConnected: -> false

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
    @callbacks = {}

  # Management & UI

  connectedError: ->
    if @isConnected()
      atom.notifications.addError "Can't create a new client.",
        detail: "There is already a Julia client running."
      true
    else
      false

  notConnectedError: ->
    if not @isConnected()
      atom.notifications.addError "Can't do that without a Julia client.",
        detail: "Try connecting a client by evaluating something."
      true
    else
      false

  require: (f) -> @notConnectedError() or f()
  disrequire: (f) -> @connectedError() or f()

  start: ->
    if not @isConnected() and not @isBooting
      atom.commands.dispatch atom.views.getView(atom.workspace),
                             'julia-client:start-julia'
