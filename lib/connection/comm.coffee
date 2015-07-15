net = require 'net'

module.exports =
  server: null
  port: null
  client: null

  handlers: {}
  callbacks: {}
  id: 0

  listen: (f) ->
    return f?(@port) if @port?
    @server = net.createServer (c) =>
      @client = c
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

  msg: (type, data, f) ->
    if f?
      data.callback = @id = @id+1
      @callbacks[@id] = f
    @client?.write(JSON.stringify([type, data]))
