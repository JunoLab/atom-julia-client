{Emitter} = require 'atom'

module.exports =

  # Messaging

  handlers: {}
  callbacks: {}
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
    return unless @isConnected()
    if f?
      data.callback = @id = @id+1
      @callbacks[@id] = f
      @loading.working()
    @output [type, data]

  handle: (type, f) ->
    @handlers[type] = f

  # Connecting & Booting

  emitter: new Emitter()

  onConnected: (cb) -> @emitter.on('connected', cb)
  onDisconnected: (cb) -> @emitter.on('disconnected', cb)

  isConnected: -> false

  booting: ->
    @isBooting = true
    @loading.working()

  notBooting: ->
    if @isBooting
      @isBooting = false
      @loading.done()

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

  # TODO: this behaves weirdly because f is evaluated late
  # Should instead evalute f immediately and make sure messages are queued.
  withClient: (f) ->
    return f() if @isConnected()
    if not @isBooting
      atom.commands.dispatch atom.views.getView(atom.workspace),
                             'julia-client:start-julia'
      listener = @onConnected =>
        listener.dispose()
        f()
      return
    # TODO: Queue commands if booting?
