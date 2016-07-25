{isEqual} = require 'underscore-plus'
basic = require './basic'

module.exports =

  cacheLength: 1

  procs: {}

  key: (path, args) -> [path, args...].join ' '

  cache: (path, args) -> @procs[@key(path, args)] ?= []

  removeFromCache: (path, args, obj) ->
    key = @key path, args
    @procs[key] = @procs[key].filter (x) -> x != obj

  toCache: (path, args, proc) ->
    @cache(path, args).push proc

  fromCache: (path, args) ->
    ps = @cache path, args
    p = ps.shift()
    if p == @booting then delete @booting
    @start path, args
    p?.proc

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
        @toCache path, args, obj
        proc.socket
          .then =>
            delete @booting
            @start path, args
          .catch (e) =>
            delete @booting
            @removeFromCache path, args, obj
            Promise.reject e
        obj
    return

  get: (path, args) ->
    @start path, args
    if (proc = @fromCache path, args)
      Promise.resolve proc
    else
      basic.get path, args
