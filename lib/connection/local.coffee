{paths} = require '../misc'
messages = require './messages'
client = require './client'

module.exports =

  activate: ->

  buffer: (f) ->
    buffer = ['']
    (data) ->
      str = data.toString()
      lines = str.split '\n'
      buffer[0] += lines.shift()
      buffer.push lines...
      while buffer.length > 1
        f buffer.shift()

  monitor: (proc) ->
    proc.onExit (code, signal) ->
      msg = "Julia has stopped"
      if not proc.wrapper
        msg += ": #{code}"
        if signal then msg += ", #{signal}"
      else
        msg += "."
      client.stderr msg
    proc.stdout.on 'data', (data) -> client.stdout data.toString()
    proc.stderr.on 'data', (data) -> client.stderr data.toString()

  connect: (proc, sock) ->
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
        @monitor proc
        Promise.all [proc, proc.socket]
      .then ([proc, sock]) =>
        @connect proc, sock
      .catch (e) ->
        console.error e
        client.cancelBoot()

  spawnJulia: ->
    paths.projectDir().then (dir) =>
      require('./process/basic').get paths.jlpath(), client.clargs()
