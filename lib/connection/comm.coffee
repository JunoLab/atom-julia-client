net = require 'net'

module.exports =
  server: null
  port: null
  client: null

  handleClient: (c) ->
    @client = c
    @client.write('hello world\n')

  activate: ->
    @server = net.createServer (c) =>
      @handleClient c
    @server.listen 0, =>
      @port = @server.address().port
