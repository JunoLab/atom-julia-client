{isEqual} = require 'underscore-plus'
{hook} = require '../../misc'
basic = require './basic'

IPC = require '../ipc'

module.exports =

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
      if p == @booting then delete @booting
      @start path, args
      p.proc

  start: (path, args) ->
    if @booting
      @booting.then (obj) =>
        return if isEqual([obj.path, obj.args], [path, args])
        obj.proc.kill()
        obj.proc.socket.catch (e) =>
          @start path, args
    else if @cache(path, args).length < @cacheLength
      @booting = basic.get(path, args).then (proc) =>
        obj = {path, args, proc: proc}
        @monitor proc
        @warmup obj
        @toCache path, args, obj
        proc.socket
          .then =>
            delete @booting
            @start path, args
          .catch (e) =>
            delete @booting
            @removeFromCache path, args, obj
        obj
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

  get: (path, args) ->
    @start path, args
    if (proc = @fromCache path, args) then proc
    else basic.get path, args

  reset: ->
    for key, ps of @procs
      for p in ps
        p.proc.kill()
