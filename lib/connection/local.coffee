{paths} = require '../misc'
messages = require './messages'
client = require './client'

cd = client.import 'cd', false

basic  = require './process/basic'
cycler = require './process/cycler'
server = require './process/server'

module.exports =

  activate: ->
    paths.getVersion()
      .then ->
        server.start paths.jlpath(), client.clargs()
      .catch ->

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
    client.readStream sock
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
    server.get path, args
