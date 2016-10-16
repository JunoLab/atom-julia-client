net = require 'net'

{bufferLines} = require '../../misc'
client = require '../client'

module.exports =
  server: null
  port: null

  listeners: []

  next: ->
    conn = new Promise (resolve) =>
      @listeners.push resolve
    conn.dispose = =>
      @listeners = @listeners.filter (x) -> x is conn
    conn

  connect: (sock) ->
    message = (m) -> sock.write JSON.stringify m
    client.readStream sock
    sock.on 'end', -> client.detach()
    sock.on 'error', -> client.detach()
    client.attach {message}

  handle: (sock) ->
    if @listeners.length > 0
      @listeners.shift()(sock)
    else if not client.isActive()
      @connect sock
    else
      sock.end()

  listen: ->
    return Promise.resolve(@port) if @port?
    new Promise (resolve) =>
      @server = net.createServer (c) => @handle c
      @server.listen 0, '127.0.0.1', =>
        @port = @server.address().port
        resolve @port
