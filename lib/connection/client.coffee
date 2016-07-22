{throttle} = require 'underscore-plus'
{Emitter} = require 'atom'

metrics = ->
  if id = localStorage.getItem 'metrics.userId'
    r = require('http').get "http://data.junolab.org/hit?id=#{id}&app=atom-julia-boot"
    r.on 'error', ->

metrics = throttle metrics, 60*60*1000

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
    metrics()
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

    @handle 'cancelCallback', (id, e) =>
      @callbacks[id].reject e
      @loading.done()

    @handle 'error', (options) =>
      if atom.config.get 'julia-client.errorNotifications'
        atom.notifications.addError options.msg, options
      console.error options.detail

  msg: (type, args...) ->
    if @isConnected()
      @conn.message [type, args...]
    else
      @queue.push [type, args...]

  rpc: (type, args...) ->
    new Promise (resolve, reject) =>
      @id += 1
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

  # Basic handlers (communication through stderr)

  basicHandlers: {}

  basicHandler: (s) ->
    if (match = s.toString().match /juno-msg-(.*)/)
      @basicHandlers[match[1]]?()
      true

  handleBasic: (msg, f) -> @basicHandlers[msg] = f

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
    delete @conn
    @reset()
    @emitter.emit 'disconnected'

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
  onceDone: (f) -> @loading.onceDone f

  # Management & UI

  onStdout: (f) -> @emitter.on 'stdout', f
  onStderr: (f) -> @emitter.on 'stderr', f
  stdout: (data) -> @emitter.emit 'stdout', data
  stderr: (data) -> @emitter.emit 'stderr', data unless @basicHandler data

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

  clargs: ->
    {precompiled, optimisationLevel} =
      atom.config.get('julia-client.juliaOptions') ? {precompiled: true, optimisationLevel: 2}
    as = []
    as.push "--precompiled=#{if precompiled then 'yes' else 'no'}"
    as.push "-O#{optimisationLevel}" unless optimisationLevel is 2
    as

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
    if @isBooting()
      atom.notifications.addError "Can't #{action} until Julia finishes booting."
    else if not @isConnected()
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
