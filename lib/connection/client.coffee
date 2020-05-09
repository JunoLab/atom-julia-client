{throttle} = require 'underscore-plus'
{Emitter} = require 'atom'

IPC = require './ipc'

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

    @bootMode = atom.config.get('julia-client.juliaOptions.bootMode')

    @ipc.writeMsg = (msg) =>
      if @isActive() and @conn.ready?() isnt false
        @conn.message msg
      else
        @ipc.queue.push msg

    @handle 'error', (options) =>
      if atom.config.get 'julia-client.uiOptions.errorNotifications'
        atom.notifications.addError options.msg, options
      console.error options.detail
      atom.beep()

    plotpane = null

    @onAttached =>
      args = atom.config.get 'julia-client.juliaOptions.arguments'
      @import('connected')()
      if args.length > 0
        @import('args') args

      plotpane = atom.config.observe 'julia-client.uiOptions.usePlotPane', (use) =>
        @import('enableplotpane')(use)

    @onDetached =>
      plotpane?.dispose()

    @onBoot (proc) =>
      @remoteConfig = proc.config

  setBootMode: (@bootMode) ->

  editorPath: (ed) ->
    if not ed? then return ed
    if @bootMode is 'Remote' and @remoteConfig?
      path = ed.getPath()
      if not path? then return path
      ind = path.indexOf(@remoteConfig.host)
      if ind > -1
        path = path.slice(ind + @remoteConfig.host.length, path.length)
        path = path.replace(/\\/g, '/')
        return path
      else
        return path
    else
      return ed.getPath()

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
  onBoot: (f) -> @emitter.on 'boot', f
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
    if @isActive()
      @clientCall 'interrupts', 'interrupt'

  disconnect: ->
    if @isActive()
      @clientCall 'disconnecting', 'disconnect'

  kill: ->
    if @isActive()
      if not @isWorking()
        @import('exit')().catch ->
      else
        @clientCall 'kill', 'kill'
    else
      @ipc.reset()

  clargs: ->
    {optimisationLevel, deprecationWarnings} =
      atom.config.get 'julia-client.juliaOptions'
    as = []
    as.push "--depwarn=#{if deprecationWarnings then 'yes' else 'no'}"
    as.push "-O#{optimisationLevel}" unless optimisationLevel is 2
    as.push "--color=yes"
    as.push "-i"
    startupArgs = atom.config.get 'julia-client.juliaOptions.startupArguments'
    if startupArgs.length > 0
      as = as.concat startupArgs
    as = as.map (arg) => arg.trim()
    as = as.filter (arg) => arg.length > 0
    as

  connectedError: (action = 'do that') ->
    if @isActive()
      atom.notifications.addError "Can't #{action} with a Julia client running.",
        description: "Stop the current client with `Packages -> Juno -> Stop Julia`."
      true
    else
      false

  notConnectedError: (action = 'do that') ->
    if not @isActive()
      atom.notifications.addError "Can't #{action} without a Julia client running.",
        description: "Start a client with `Packages -> Juno -> Start Julia`."
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
