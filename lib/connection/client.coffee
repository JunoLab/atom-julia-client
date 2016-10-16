{throttle} = require 'underscore-plus'
{Emitter} = require 'atom'

IPC = require './ipc'

metrics = throttle metrics, 60*60*1000

module.exports =

  # Connection logic injects a connection via `attach`.
  ## Required interface:
  # .message(json)
  ## Optional interface:
  # .stdin(data)
  # .interrupt()
  # .kill()

  # Messaging

  ipc: new IPC

  handle: (a...) -> @ipc.handle a...
  input: (m)  -> @ipc.input m
  readStream: (s) -> @ipc.readStream s
  import: (a...) -> @ipc.import a...

  activate: ->

    @emitter = new Emitter

    @ipc.writeMsg = (msg) =>
      if @isActive() and @conn.ready?() isnt false
        @conn.message msg
      else
        @ipc.queue.push msg

    @handle 'error', (options) =>
      if atom.config.get 'julia-client.errorNotifications'
        atom.notifications.addError options.msg, options
      console.error options.detail

  deactivate: ->
    @emitter.dispose()
    if @isActive() then @detach()

  # Basic handlers (communication through stderr)

  basicHandlers: {}

  basicHandler: (s) ->
    if (match = s.toString().match /juno-msg-(.*)/)
      @basicHandlers[match[1]]?()
      true

  handleBasic: (msg, f) -> @basicHandlers[msg] = f

  # Connecting & Booting

  emitter: new Emitter

  onAttached: (cb) -> @emitter.on 'attached', cb
  onDetached: (cb) -> @emitter.on 'detached', cb

  onceAttached: (cb) ->
    f = @onAttached (args...) ->
      f.dispose()
      cb.call this, args...

  isActive: -> @conn?

  attach: (@conn) ->
    @flush() unless @conn.ready?() is false
    @emitter.emit 'attached'

  detach: ->
    delete @conn
    @ipc.reset()
    @emitter.emit 'detached'

  flush: -> @ipc.flush()

  isWorking: -> @ipc.isWorking()
  onWorking: (f) -> @ipc.onWorking f
  onDone: (f) -> @ipc.onDone f
  onceDone: (f) -> @ipc.onceDone f

  # Management & UI

  onStdout: (f) -> @emitter.on 'stdout', f
  onStderr: (f) -> @emitter.on 'stderr', f
  onInfo: (f) -> @emitter.on 'info', f
  stdout: (data) -> @emitter.emit 'stdout', data
  stderr: (data) -> @emitter.emit 'stderr', data unless @basicHandler data
  info: (data) -> @emitter.emit 'info', data

  clientCall: (name, f, args...) ->
    if not @conn[f]?
      atom.notifications.addError "This client doesn't support #{name}."
    else
      @conn[f].call @conn, args...

  stdin: (data) -> @clientCall 'STDIN', 'stdin', data

  interrupt: ->
    if @isActive() and @isWorking()
      @clientCall 'interrupts', 'interrupt'

  kill: ->
    if @isActive()
      if not @isWorking()
        @import('exit')().catch ->
      else
        @clientCall 'kill', 'kill'
    else
      @ipc.reset()

  clargs: ->
    {precompiled, optimisationLevel, deprecationWarnings} =
      atom.config.get 'julia-client.juliaOptions'
    as = []
    as.push "--depwarn=#{if deprecationWarnings then 'yes' else 'no'}"
    as.push "-O#{optimisationLevel}" unless optimisationLevel is 2
    as.push "-i"
    as

  connectedError: (action = 'do that') ->
    if @isActive()
      atom.notifications.addError "Can't #{action} with a Julia client running.",
        detail: "Stop the current client with Packages → Julia → Stop Julia."
      true
    else
      false

  notConnectedError: (action = 'do that') ->
    if not @isActive()
      atom.notifications.addError "Can't #{action} without a Julia client running.",
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

  withCurrent: (f) ->
    current = @conn
    (a...) =>
      return unless current is @conn
      f(a...)
