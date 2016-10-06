net = require 'net'
child_process = require 'child_process'

{paths, mutex} = require '../../misc'
client = require '../client'
tcp = require './tcp'

module.exports =

  lock: mutex()

  freePort: ->
    new Promise (resolve) ->
      server = net.createServer()
      server.listen 0, '127.0.0.1', ->
        port = server.address().port
        server.close()
        resolve port

  createProc: (proc, obj = {}) ->
    obj.proc ?= proc
    obj.onExit = (f) ->
      proc.on 'exit', f
      {dispose: -> proc.removeListener('exit', f)}
    obj.stdin ?= (data) -> proc.stdin.write data
    obj.onStdout ?= (f) -> proc.stdout.on 'data', f
    obj.onStderr ?= (f) -> proc.stderr.on 'data', f
    obj

  watchProcExit: (proc, reject) ->
    proc.on 'exit', (code, status) ->
      reject [code, status]
    proc.on 'error', (err) -> reject err

  # Used only when Julia is a server, which it's not for now
  socket: (proc, port) ->
    new Promise (resolve, reject) =>
      proc.stderr.on 'data', f = (data) ->
        if data.toString().indexOf('juno-msg-ready') != -1
          proc.stderr.removeListener 'data', f
          resolve net.connect port
      @watchProcExit proc, reject

  clientSocket: (proc) ->
    conn = tcp.next()
    failure = new Promise (resolve, reject) =>
      @watchProcExit proc, (err) ->
        conn.dispose()
        reject err
    Promise.race [conn, failure]

  get_: (path, args) ->
    tcp.listen().then (port) =>
      proc = child_process.spawn path, [args..., paths.script('boot.jl'), port]

      @createProc proc,
        kill: -> proc.kill()
        interrupt: -> proc.kill 'SIGINT'
        socket: @clientSocket proc

  get: (a...) ->
    @lock (release) =>
      p = @get_ a...
      release p.then ({socket}) -> socket
      p
