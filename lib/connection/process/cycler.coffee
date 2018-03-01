{isEqual} = require 'underscore-plus'
basic = require './basic'
basic2 = require './basic2'

IPC = require '../ipc'

module.exports =
  provider: ->
    switch atom.config.get 'julia-client.consoleOptions.consoleStyle'
      when 'REPL-based' then basic2
      when 'Legacy' then basic

  cacheLength: 1

  procs: {}

  key: (path, args) -> [path, args...].join ' '

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
    @provider().lock (release) =>
      if @cache(path, args).length < @cacheLength
        @provider().get_(path, args).then (proc) =>
          obj = {path, args, proc: proc}
          @monitor proc
          @warmup obj
          @toCache path, args, obj
          proc.socket
            .then => @start path, args
            .catch (e) => @removeFromCache path, args, obj
          release proc.socket
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
  console: (ipc) -> ipc.rpc 'evalrepl', {code: 'Void()'}
  completions: (ipc) -> ipc.rpc 'cacheCompletions', 'Main'

  warmup: (obj) ->
    obj.init = Promise.resolve()
    obj.proc.socket
      .then (sock) =>
        return unless obj.cached
        ipc = new IPC sock
        [@boot, @console, @completions].forEach (f) ->
          obj.init = obj.init.then ->
            if obj.cached then f ipc
        obj.init = obj.init
          .catch (err) -> console.warn 'julia warmup error:', err
          .then -> ipc.unreadStream()
        return
      .catch ->

  get: (path, args) ->
    if (proc = @fromCache path, args) then p = proc
    else p = @provider().get path, args
    @start path, args
    p

  reset: ->
    for key, ps of @procs
      for p in ps
        p.proc.kill()
