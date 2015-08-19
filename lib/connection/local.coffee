net = require 'net'
client = require './client'

module.exports =
  server: null
  port: null
  sock: null

  listen: (f) ->
    return f?(@port) if @port?
    client.isConnected = => @sock?
    @server = net.createServer (c) =>
      if @sock then return c.end()
      @sock = c
      client.sock = @sock
      client.emitter.emit 'connected'
      if client.isBooting
        client.isBooting = false
        client.loading.done()
      c.on 'end', =>
        @sock = null
        client.emitter.emit 'disconnected'
        client.loading.reset()
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
        if client.handlers.hasOwnProperty type
          if data.callback?
            client.handlers[type] data, (result) =>
              @msg data.callback, result
          else
            client.handlers[type] data
        else if client.callbacks.hasOwnProperty type
          client.callbacks[type] data
          delete client.callbacks[type]
          client.loading.done()
        else
          console.log "julia-client: unrecognised message #{type}"
          console.log data

    @server.listen 0, =>
      @port = @server.address().port
      f?(@port)
