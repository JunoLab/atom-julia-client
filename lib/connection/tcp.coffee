net = require 'net'

client = require './client'

module.exports =
  server: null
  port: null
  sock: null

  buffer: (f) ->
    buffer = ['']
    (data) ->
      str = data.toString()
      lines = str.split '\n'
      buffer[0] += lines.shift()
      buffer.push lines...
      while buffer.length > 1
        f buffer.shift()

  listen: (f) ->
    return f?(@port) if @port?
    client.isConnected = => @sock?
    client.output = (data) => @sock.write JSON.stringify data
    @server = net.createServer (c) =>
      if @sock then return c.end()
      @sock = c
      client.connected()
      c.on 'end', =>
        @sock = null
        client.disconnected()
      c.on 'error', (e) =>
        console.error 'Julia Client: TCP connection error:'
        console.error e
        @sock = null
        client.disconnected()
      c.on 'data', @buffer (s) =>
        client.input JSON.parse s

      @server.listen 0, 'localhost', =>
        @port = @server.address().port
        f?(@port)
