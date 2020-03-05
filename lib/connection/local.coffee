{paths} = require '../misc'
messages = require './messages'
client = require './client'

junorc = client.import 'junorc', false

cycler = require './process/cycler'
ssh = require './process/remote'
basic = require './process/basic'

module.exports =
  consumeGetServerConfig: (getconf) ->
    ssh.consumeGetServerConfig(getconf)

  consumeGetServerName: (name) ->
    ssh.consumeGetServerName(name)

  provider: (p) ->
    bootMode = undefined
    if p?
      bootMode = p
    else
      bootMode = atom.config.get('julia-client.juliaOptions.bootMode')
    switch bootMode
      when 'Cycler' then cycler
      when 'Remote' then ssh
      when 'Basic'  then basic

  activate: ->
    if process.platform == 'win32'
      process.env.JULIA_EDITOR = "\"#{process.execPath}\" #{if atom.devMode then '-d' else ''} -a"
    else
      process.env.JULIA_EDITOR = "atom #{if atom.devMode then '-d' else ''} -a"

    paths.getVersion()
      .then =>
        @provider().start? paths.jlpath(), client.clargs()
      .catch ->

  monitor: (proc) ->
    client.emitter.emit('boot', proc)
    proc.ready = -> false
    client.attach(proc)
    return proc

  connect: (proc, sock) ->
    proc.message = (m) -> sock.write JSON.stringify m
    client.readStream sock
    sock.on 'end', ->
      proc.kill()
      client.detach()
    sock.on 'error', ->
      proc.kill()
      client.detach()
    proc.ready = -> true
    client.flush()
    proc

  start: (provider) ->
    [path, args] = [paths.jlpath(), client.clargs()]
    check = paths.getVersion()

    if provider is 'Remote'
      check = Promise.resolve()
    else
      check.catch (err) =>
        messages.jlNotFound paths.jlpath(), err

    proc = check
      .then => @spawnJulia(path, args, provider)
      .then (proc) => @monitor(proc)

    # set working directory here, so we queue this task before anything else
    if provider is 'Remote'
      ssh.withRemoteConfig((conf) -> junorc conf.remote).catch ->
    else
      paths.projectDir().then (dir) -> junorc dir

    proc
      .then (proc) =>
        Promise.all [proc, proc.socket]
      .then ([proc, sock]) =>
        @connect proc, sock
      .catch (e) ->
        client.detach()
        console.error("Julia exited with #{e}.")
    proc

  spawnJulia: (path, args, provider) ->
    @provider(provider).get(path, args)
