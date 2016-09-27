{isEqual} = require 'underscore-plus'
basic = require './basic'

IPC = require '../ipc'

module.exports =

  cacheLength: 1

  procs: {}

  key: (path, args, cwd) -> [path, args..., cwd].join ' '

  cache: (path, args, cwd) -> @procs[@key(path, args, cwd)] ?= []

  removeFromCache: (path, args, obj, cwd) ->
    key = @key path, args, cwd
    @procs[key] = @procs[key].filter (x) -> x != obj

  toCache: (path, args, proc, cwd) ->
    proc.cached = true
    @cache(path, args, cwd).push proc

  fromCache: (path, args, cwd) ->
    ps = @cache path, args, cwd
    p = ps.shift()
    return unless p?
    p.cached = false
    p.init.then =>
      @start path, args, cwd
      p.proc

  start: (path, args, cwd) ->
    basic.lock (release) =>
      if @cache(path, args).length < @cacheLength
        basic.get_(path, args, cwd).then (proc) =>
          obj = {path, args, proc: proc}
          @monitor proc
          @warmup obj
          @toCache path, args, obj
          proc.socket
            .then => @start path, args, cwd
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
    proc.onStdout (data) -> proc.events?.push {type: 'stdout', data}
    proc.onStderr (data) -> proc.events?.push {type: 'stderr', data}
    proc.flush = (out, err) =>
      @flush proc.events, out, err
      delete proc.events

  boot: (ipc) -> ipc.rpc 'ping'
  console: (ipc) -> ipc.rpc 'evalrepl', {code: 'Void()'}
  editor: (ipc) -> ipc.rpc 'eval', {text: '2+2', mod: 'Main', line: 1, path: 'untitled'}
  completions: (ipc) -> ipc.rpc 'cacheCompletions', 'Main'

  warmup: (obj) ->
    obj.init = Promise.resolve()
    obj.proc.socket
      .then (sock) =>
        return unless obj.cached
        ipc = new IPC sock
        [@boot, @console, @editor, @completions].forEach (f) ->
          obj.init = obj.init.then ->
            if obj.cached then f ipc
        obj.init = obj.init
          .catch (err) -> console.warn 'julia warmup error:', err
          .then -> ipc.unreadStream()
        return
      .catch ->

  get: (path, args, cwd) ->
    if (proc = @fromCache path, args, cwd) then p = proc
    else p = basic.get path, args, cwd
    @start path, args, cwd
    p

  reset: ->
    for key, ps of @procs
      for p in ps
        p.proc.kill()
