{debounce} = require 'underscore-plus'

{client} =   require '../connection'
modules =    require './modules'
evaluation = require './evaluation'

{completions, cacheCompletions} = client.import ['completions', 'cacheCompletions']

module.exports =
  selector: '.source.julia'
  filterSuggestions: true
  excludeLowerPriority: false

  rawCompletions: ({editor, bufferPosition: {row, column}}) ->
    completions
      mod: modules.current()
      line: editor.getTextInBufferRange [[row, 0], [row, Infinity]]
      column: column+1

  toCompletion: (c, pre) ->
    if c.constructor is String
      c = text: c
    if not c.prefix?
      c.replacementPrefix = pre
    c

  processCompletions: (completions, prefix) ->
    completions.map((c) => @toCompletion c, prefix)

  getSuggestions: (data) ->
    return [] unless client.isConnected()
    @rawCompletions(data).then ({completions, prefix, mod}) =>
      return @fromCache mod, prefix if not completions?
      @processCompletions completions, prefix

  cache: {}

  updateCache_: (mod) ->
    cacheCompletions(mod).then (cs) =>
      @cache[mod] = cs

  updateCache: debounce ((mod) -> @updateCache_ mod), 1000, true

  fromCache: (mod, prefix) ->
    @updateCache mod
    @processCompletions(@cache[mod] or [], prefix)
