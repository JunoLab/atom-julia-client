os = require 'os'
net = require 'net'
path = require 'path'
fs = require 'fs'
child_process = require 'child_process'

{exclusive} = require '../../misc'

IPC = require '../ipc'
basic = require './basic'
cycler = require './cycler'

module.exports =

  socketPath: (name) ->
    if process.platform is 'win32'
      "\\\\.\\pipe\\#{name}"
    else
      path.join(os.tmpdir(), "#{name}.sock")

  removeSocket: (name) ->
    new Promise (resolve, reject) =>
      p = @socketPath name
      fs.exists p, (exists) ->
        if not exists then return resolve()
        fs.unlink p, (err) ->
          if err then reject(err) else resolve()

  # Client

  boot: ->
    @removeSocket('juno-server').then =>
      new Promise (resolve, reject) =>
        console.info 'booting julia server'
        proc = child_process.fork path.join(__dirname, 'boot.js'),
          detached: true
          env: process.env
        proc.on 'message', (x) ->
          if x == 'ready' then resolve()
          else console.log 'julia server:', x
        proc.on 'exit', (code, status) ->
          console.warn 'julia server:', [code, status]
          reject([code, status])

  connect: ->
    new Promise (resolve, reject) =>
      client = net.connect @socketPath('juno-server'), =>
        ipc = new IPC client
        resolve ipc.import Object.keys(@serverAPI()), true, {ipc}
      client.on 'error', (err) ->
        reject err

  activate: exclusive ->
    return @server if @server?
    @connect()
      .catch (err) =>
        if err.code in ['ECONNREFUSED', 'ENOENT']
          @boot().then => @connect()
        else Promise.reject err
      .then (@server) =>
        @server.ipc.stream.on 'end', => delete @server
        @server.setPS basic.wrapperEnabled()
        @server

  getStream: (id, s) ->
    @connect().then ({ipc}) ->
      sock = ipc.stream
      ipc.msg s, id
      ipc.unreadStream()
      sock

  getStreams: (id) -> Promise.all (@getStream id, s for s in ['stdin', 'stdout', 'stderr'])

  getSocket: (id) ->
    @server.onBoot(id).then =>
      @getStream(id, 'socket').then (sock) =>
        @server.onAttach(id).then -> sock

  get: (path, args) ->
    @activate()
      .then => @server.get path, args
      .then (id) => Promise.all [id, @getStreams(id), @server.events(id)]
      .then ([id, [stdin, stdout, stderr], events]) =>
        stdin: (data) -> stdin.write data
        onStdout: (f) -> stdout.on 'data', f
        onStderr: (f) -> stderr.on 'data', f
        flush: (out, err) -> cycler.flush events, out, err
        interrupt: => @server.interrupt id
        kill:      => @server.kill id
        socket: @getSocket id
        onExit: (f) =>
          Promise.race [@server.onExit(id),
                        new Promise (resolve) => @server.ipc.stream.on 'end', resolve]
            .then f

  start: (path, args) ->
    @activate()
      .then => @server.start path, args

  reset: ->
    @connect()
      .then (server) -> server.exit().catch ->
      .catch -> atom.notifications.addInfo 'No server running.'

  # Server

  initIPC: (sock) ->
    # TODO: exit once all clients close
    ipc = new IPC sock
    ipc.handle @serverAPI()
    @streamHandlers ipc
    ipc

  serve: ->
    cycler.cacheLength = 2
    basic.wrapperEnabled = -> true
    @server = net.createServer (sock) =>
      @initIPC sock
    @server.listen @socketPath('juno-server'), ->
      process.send 'ready'
    @server.on 'error', (err) ->
      process.send err
      process.exit()

  pid: 0
  ps: {}

  serverAPI: ->

    setPS: (enabled) -> basic.wrapperEnabled = -> enabled

    get: (path, args) =>
      cycler.get(path, args)
        .then (p) =>
          p.id = (@pid += 1)
          @ps[p.id] = p
          p.id

    start: (path, args) -> cycler.start path, args

    onBoot: (id) => @ps[id].socket.then -> true
    onExit: (id) => new Promise (resolve) => @ps[id].onExit resolve
    onAttach: (id) => @ps[id].attached.then ->
    interrupt: (id) => @ps[id].interrupt()
    kill: (id) => @ps[id].kill()

    events: (id) =>
      proc = @ps[id]
      events = proc.events ? []
      delete proc.events
      for event in events
        event.data = event.data?.toString()
      events

    exit: =>
      cycler.reset()
      for id, proc of @ps
        proc.kill()
      process.exit()

  crossStreams: (a, b) ->
    [[a, b], [b, a]].forEach ([from, to]) ->
      from.on 'data', (data) ->
        try to.write data
        catch e
          if process.connected
            process.send {type: 'error', message: e.message, stack: e.stack, data: data.toString()}

  mutualClose: (a, b) ->
    [[a, b], [b, a]].forEach ([from, to]) ->
      from.on 'end', -> to.end()
      from.on 'error', -> to.end()

  streamHandlers: (ipc) ->
    ['socket', 'stdout', 'stderr', 'stdin'].forEach (stream) =>
      ipc.handle stream, (id) =>
        proc = @ps[id]
        sock = ipc.stream
        ipc.unreadStream()
        source = if stream == 'socket' then proc.socket else proc.proc[stream]
        proc.attached = Promise.resolve(source).then (source) =>
          @crossStreams source, sock
          if stream == 'socket' then @mutualClose source, sock
          else sock.on 'end', -> proc.kill()
