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

  listen: (f) ->
    return f?(@port) if @port?
    @server = net.createServer (c) =>
      if @isConnected() then return c.end()
      @client = c
      @emitter.emit 'connected'
      c.on 'end', =>
        @client = null
        @emitter.emit 'disconnected'
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
          @handlers[type] data
        else if @callbacks.hasOwnProperty type
          @callbacks[type] data
          delete @callbacks[type]
        else
          console.log "julia-client: unrecognised message #{type}"
          console.log data

    @server.listen 0, =>
      @port = @server.address().port
      f?(@port)

  isConnected: -> @client?

  connectedError: ->
    if @isConnected()
      atom.notifications.addError "Can't create a new client.",
                                  {detail: "There is already a Julia client running."}
      true
    else
      false

  notConnectedError: ->
    if not @isConnected()
      atom.notifications.addError "Can't do that without a Julia client.",
                                  {detail: "Try connecting a client by evaluating."}
      true
    else
      false

  msg: (type, data, f) ->
    if f?
      data.callback = @id = @id+1
      @callbacks[@id] = f
    @client?.write(JSON.stringify([type, data]))
