{throttle} = require 'underscore-plus'
{Emitter} = require 'atom'

IPC = require './ipc'

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

  ipc: new IPC

  msg: (a...) -> @ipc.msg a...
  rpc: (a...) -> @ipc.rpc a...
  handle: (a...) -> @ipc.handle a...
  input: (a...) -> @ipc.input a...
  import: (a...) -> @ipc.import a...

  activate: ->

    @ipc.writeMsg = (msg) =>
      if @isConnected()
        @conn.message msg
      else
        @ipc.queue.push msg

    @handle 'error', (options) =>
      if atom.config.get 'julia-client.errorNotifications'
        atom.notifications.addError options.msg, options
      console.error options.detail

  # Basic handlers (communication through stderr)

  basicHandlers: {}

  basicHandler: (s) ->
    if (match = s.toString().match /juno-msg-(.*)/)
      @basicHandlers[match[1]]?()
      true

  handleBasic: (msg, f) -> @basicHandlers[msg] = f

  # Connecting & Booting

  emitter: new Emitter

  onConnected: (cb) -> @emitter.on 'connected', cb
  onDisconnected: (cb) -> @emitter.on 'disconnected', cb

  isBooting: -> false

  isConnected: -> @conn?

  isActive: -> @isConnected() || @isBooting()

  connected: (@conn) ->
    metrics()
    @emitter.emit 'connected'
    if @isBooting()
      @isBooting = -> false
    @ipc.flush()

  disconnected: ->
    delete @conn
    @reset()
    @emitter.emit 'disconnected'

  booting: ->
    @isBooting = -> true

  cancelBoot: ->
    if @isBooting()
      @isBooting = -> false
      @reset()

  reset: ->
    @cancelBoot()
    @ipc.reset()

  isWorking: -> @ipc.isWorking()
  onWorking: (f) -> @ipc.onWorking f
  onDone: (f) -> @ipc.onDone f
  onceDone: (f) -> @ipc.onceDone f

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
    as.push "-i"
    as.push "--depwarn=no"
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
