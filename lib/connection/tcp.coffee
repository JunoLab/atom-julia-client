net = require 'net'
child_process = require 'child_process'
client = require './client'

module.exports =
  server: null
  port: null
  sock: null
  host: null

  buffer: (f) ->
    buffer = ['']
    (data) ->
      str = data.toString()
      lines = str.split '\n'
      buffer[0] += lines.shift()
      buffer.push lines...
      while buffer.length > 1
        f buffer.shift()

  connect: (f) ->
    # return f?(@port) if @port?
    @port = 9000
    julia_docker = process.env["JULIA_DOCKER_MACHINE"]
    if julia_docker?
      @host = String(child_process.execSync "docker-machine inspect -f '{{.Driver.IPAddress}}' #{julia_docker}").trim()
    else
      @host = "localhost"
    console.log "Host set to #{@host}"
    client.isConnected = => @sock?
    client.output = (data) => @sock.write JSON.stringify data
    f @port
    console.log "Waiting for Julia server to start"
    setTimeout (=>
      console.log "Attempting connection"
      @sock = net.connect @port, @host, =>
        console.log "Connected"
        client.connected()
      @sock.on 'end', =>
        @sock = null
        client.disconnected()
      @sock.on 'error', (e) =>
        console.error 'Julia Client: TCP connection error:'
        console.error e
        @sock = null
        client.disconnected()
      @sock.on 'data', @buffer (s) =>
        client.input JSON.parse s), 10000
