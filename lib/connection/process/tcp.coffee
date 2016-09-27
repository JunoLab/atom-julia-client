net = require 'net'

{bufferLines} = require '../../misc'
client = require '../client'

module.exports =
  server: null
  port: null

  listeners: []

  next: ->
    new Promise (resolve) =>
      @listeners.push resolve

  handle: (sock) ->
    return sock.end() unless @listeners.length > 0
    @listeners.shift()(sock)

  listen: ->
    return Promise.resolve(@port) if @port?
    new Promise (resolve) =>
      @server = net.createServer (c) => @handle c
      @server.listen 0, '127.0.0.1', =>
        @port = @server.address().port
        resolve @port
