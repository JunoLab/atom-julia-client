{Emitter} = require 'atom'

module.exports =

  # Connection logic injects a connection via `connected`.
  ## Required interface:
  # .message(json)
  ## Optional interface:
  # .stdin(data)
  # .interrupt()
  # .kill()

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
        @callbacks[id].resolve result
      finally
        delete @callbacks[id]
        @loading.done()

    @handle 'cancelCallback', (id) =>
      @callbacks[id].reject "cancelled by julia"
      @loading.done()

  msg: (type, args...) ->
    if @isConnected()
      @conn.message [type, args...]
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

  isBooting: -> false

  isConnected: -> @conn?

  isActive: -> @isConnected() || @isBooting()

  connected: (@conn) ->
    @emitter.emit 'connected'
    if @isBooting()
      @isBooting = -> false
      @loading.done()
    @conn.message msg for msg in @queue
    @queue = []

  disconnected: ->
    @emitter.emit 'disconnected'
    delete @conn
    @reset()

  booting: ->
    @isBooting = -> true
    @loading.working()

  cancelBoot: ->
    if @isBooting()
      @isBooting = -> false
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

  onStdout: (f) -> @emitter.on 'stdout', f
  onStderr: (f) -> @emitter.on 'stderr', f
  stdout: (data) -> @emitter.emit 'stdout', data
  stderr: (data) -> @emitter.emit 'stderr', data

  clientCall: (name, f, args...) ->
    if not @conn[f]?
      atom.notifications.addError "This client doesn't support #{name}."
    else
      @conn[f].call @conn, args...

  stdin: (data) -> @clientCall 'STDIN', 'stdin', data

  interrupt: ->
    if @isConnected() and @isWorking()
      @clientCall 'interrupts', 'interrupt'

  kill: ->
    if @isConnected() and not @isWorking()
      @rpc('exit').catch ->
    else
      @clientCall 'kill', 'kill'

  connectedError: (action = 'do that') ->
    if @isConnected()
      atom.notifications.addError "Can't #{action} with a Julia client running.",
        detail: "Stop the current client with Packages → Julia → Stop Julia."
      true
    else if @isBooting()
      atom.notifications.addError "Can't #{action} with a Julia client booting."
    else
      false

  notConnectedError: (action = 'do that') ->
    if not @isConnected()
      atom.notifications.addError "Can't #{action} without a Julia client.",
        detail: "Start Julia using Packages → Julia → Start Julia."
      true
    else
      false

  require: (a, f) ->
    f ? [a, f] = [null, a]
    @notConnectedError(a) or f()

  disrequire: (a, f) ->
    f ? [a, f] = [null, a]
    @connectedError(a) or f()
