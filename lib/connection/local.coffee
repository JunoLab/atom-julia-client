net = require 'net'
client = require './client'

module.exports =
  server: null
  port: null
  sock: null

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
      # Data will be split into chunks, so we have to buffer it before parsing.
      buffer = ['']
      c.on 'data', (data) =>
        str = data.toString()
        lines = str.split '\n'
        buffer[0] += lines.shift()
        buffer.push lines...

        while buffer.length > 1
          line buffer.shift()

      line = (s) => client.input JSON.parse s

    @server.listen 0, =>
      @port = @server.address().port
      f?(@port)
