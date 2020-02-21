{isEqual} = require 'underscore-plus'
hash = require 'object-hash'
basic = require './basic'

IPC = require '../ipc'

module.exports =
  provider: ->
    basic

  cacheLength: 1

  procs: {}

  key: (path, args) -> hash([path, args...].join(' ').trim())

  cache: (path, args) -> @procs[@key(path, args)] ?= []

  removeFromCache: (path, args, obj) ->
    key = @key path, args
    @procs[key] = @procs[key].filter (x) -> x != obj

  toCache: (path, args, proc) ->
    proc.cached = true
    @cache(path, args).push proc

  fromCache: (path, args) ->
    ps = @cache path, args
    p = ps.shift()
    return unless p?
    p.cached = false
    p.init.then =>
      @start path, args
      p.proc

  start: (path, args) ->
    allArgs = [args, atom.config.get('julia-client.juliaOptions')]
    @provider().lock (release) =>
      if @cache(path, allArgs).length < @cacheLength
        p = @provider().get_(path, args).then (proc) =>
          obj = {path, allArgs, proc: proc}
          @monitor proc
          @warmup obj
          @toCache path, allArgs, obj
          proc.socket
            .then => @start path, allArgs
            .catch (e) => @removeFromCache path, allArgs, obj
          release proc.socket
        p.catch (err) =>
          release()
      else
        release()
    return

  flush: (events, out, err) ->
    for {type, data} in events
      (if type == 'stdout' then out else err) data

  monitor: (proc) ->
    proc.events = []
    proc.wasCached = true
    proc.onStdout (data) -> proc.events?.push {type: 'stdout', data}
    proc.onStderr (data) -> proc.events?.push {type: 'stderr', data}
    proc.flush = (out, err) =>
      @flush proc.events, out, err
      delete proc.events

  boot: (ipc) -> ipc.rpc 'ping'
  repl: (ipc) -> ipc.rpc 'changemodule', {mod: 'Main'}

  warmup: (obj) ->
    obj.init = Promise.resolve()
    obj.proc.socket
      .then (sock) =>
        return unless obj.cached
        ipc = new IPC sock
        [@boot, @repl].forEach (f) ->
          obj.init = obj.init.then ->
            if obj.cached then f ipc
        obj.init = obj.init
          .catch (err) -> console.warn 'julia warmup error:', err
          .then -> ipc.unreadStream()
        return
      .catch ->

  get: (path, args) ->
    allArgs = [args, atom.config.get('julia-client.juliaOptions')]
    if (proc = @fromCache path, allArgs) then p = proc
    else p = @provider().get path, args
    @start path, args
    p

  reset: ->
    for key, ps of @procs
      for p in ps
        p.proc.kill()
