{paths} = require '../misc'
messages = require './messages'
client = require './client'

cd = client.import 'cd', false

basic = require './process/basic'
cycler = require './process/cycler'

module.exports =

  activate: ->
    paths.getVersion()
      .then ->
        cycler.start paths.jlpath(), client.clargs()
      .catch ->

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
    out = (data) -> client.stdout data.toString()
    err = (data) -> client.stderr data.toString()
    proc.flush? out, err
    proc.onStdout out
    proc.onStderr err

  connect: (proc, sock) ->
    proc.message = (m) -> sock.write JSON.stringify m
    sock.on 'data', @buffer (m) -> client.input JSON.parse m
    sock.on 'end', -> client.disconnected()
    client.connected proc

  start: ->
    [path, args] = [paths.jlpath(), client.clargs()]
    client.booting()
    paths.projectDir().then (dir) -> cd dir
    check = paths.getVersion()

    check.catch (err) =>
      messages.jlNotFound paths.jlpath(), err
      client.cancelBoot()

    check
      .then =>
        @spawnJulia path, args
      .then (proc) =>
        @monitor proc
        Promise.all [proc, proc.socket]
      .then ([proc, sock]) =>
        @connect proc, sock
      .catch (e) ->
        client.cancelBoot()
        throw e

  spawnJulia: (path, args) ->
    cycler.get path, args
