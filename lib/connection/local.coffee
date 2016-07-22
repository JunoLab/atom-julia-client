{paths} = require '../misc'
messages = require './messages'
client = require './client'

module.exports =

  activate: ->
    client.onConnected => @bootFailListener?.dispose()

  buffer: (f) ->
    buffer = ['']
    (data) ->
      str = data.toString()
      lines = str.split '\n'
      buffer[0] += lines.shift()
      buffer.push lines...
      while buffer.length > 1
        f buffer.shift()

  monitorBoot: (proc) ->
    @bootFailListener = proc.onExit (code, signal) =>
      client.stderr "Julia has stopped"
      if not @useWrapper then client.stderr ": #{code}, #{signal}"
      client.cancelBoot()

  init: (proc, sock) ->
    proc.message = (m) -> sock.write JSON.stringify m
    sock.on 'data', @buffer (m) -> client.input JSON.parse m
    sock.on 'end', -> client.disconnected()
    client.connected proc

  start: ->
    client.booting()
    paths.projectDir().then (dir) -> client.msg 'cd', dir
    paths.getVersion()
      .catch (err) =>
        messages.jlNotFound paths.jlpath(), err
        client.cancelBoot()
      .then => @spawnJulia()
      .then (p) =>
        proc = p
        @monitorBoot proc
        Promise.all [proc, proc.socket]
      .then ([proc, sock]) =>
        @init proc, sock

  spawnJulia: ->
    paths.projectDir().then (dir) =>
      require('./process/basic').get paths.jlpath(), client.clargs()
