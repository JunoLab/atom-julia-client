{Emitter} = require 'atom'
net = require 'net'

module.exports =

  activate: ->
    @emitter = new Emitter()

  onConnected: (cb) -> @emitter.on('connected', cb)
  onDisconnected: (cb) -> @emitter.on('disconnected', cb)

  server: null
  port: null
  client: null

  handlers: {}
  callbacks: {}
  id: 0

  # TODO: refactor this
  listen: (f) ->
    return f?(@port) if @port?
    @server = net.createServer (c) =>
      if @isConnected() then return c.end()
      @client = c
      @emitter.emit 'connected'
      if @isBooting
        @isBooting = false
        @loading.done()
      c.on 'end', =>
        @client = null
        @emitter.emit 'disconnected'
        @loading.reset()
      # Data will be split into chunks, so we have to buffer it before parsing.
      buffer = ['']
      c.on 'data', (data) =>
        str = data.toString()
        lines = str.split '\n'
        buffer[0] += lines.shift()
        buffer.push lines...

        while buffer.length > 1
          line buffer.shift()

      line = (s) =>
        [type, data] = JSON.parse s
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

    @server.listen 0, =>
      @port = @server.address().port
      f?(@port)

  isConnected: -> @client?

  booting: ->
    @isBooting = true
    @loading.working()

  notBooting: ->
    if @isBooting
      @isBooting = false
      @loading.done()

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

  msg: (type, data, f) ->
    return unless @client?
    if f?
      data.callback = @id = @id+1
      @callbacks[@id] = f
      @loading.working()
    @client.write(JSON.stringify([type, data]))

  handle: (type, f) ->
    @handlers[type] = f

  # TODO: this behaves weirdly because f is evaluated late
  # Should instead evalute f immediately and make sure messages are queued.
  withClient: (f) ->
    return f() if @client?
    if not @isBooting
      atom.commands.dispatch atom.views.getView(atom.workspace),
                             'julia-client:start-julia'
      listener = @onConnected =>
        listener.dispose()
        f()
      return
    # TODO: Queue commands if booting?
