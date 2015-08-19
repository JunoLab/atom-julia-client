{Emitter} = require 'atom'

module.exports =

  # Messaging

  handlers: {}
  callbacks: {}
  queue: []
  id: 0

  input: ([type, data]) ->
    if @handlers.hasOwnProperty type
      if data.callback?
        @handlers[type] data, (result) =>
          @msg data.callback, result
      else
        @handlers[type] data
    else if @callbacks.hasOwnProperty type
      @callbacks[type] data
      delete @callbacks[type]
      @loading.done()
    else
      console.log "julia-client: unrecognised message #{type}"
      console.log data

  output: (data) ->

  msg: (type, data, f) ->
    if f?
      data.callback = @id = @id+1
      @callbacks[@id] = f
      @loading.working()
    if @isConnected()
      @output [type, data]
    else
      @queue.push [type, data]

  handle: (type, f) ->
    @handlers[type] = f

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

  requireClient: (f) -> @notConnectedError() or f()
  requireNoClient: (f) -> @connectedError() or f()

  withClient: (f) ->
    f()
    if not @isConnected() and not @isBooting
      atom.commands.dispatch atom.views.getView(atom.workspace),
                             'julia-client:start-julia'
