# TODO: custom sorting?
# TODO: complete quotes for strings

{debounce} = require 'underscore-plus'

{client} =   require '../connection'
modules =    require './modules'
evaluation = require './evaluation'

{completions, cacheCompletions} = client.import ['completions', 'cacheCompletions']

module.exports =
  scopeSelector: '.source.julia'
  textEditorSelectors: 'atom-text-editor'
  filterSuggestions: true
  excludeLowerPriority: false

  sleep: (n) ->
    new Promise((resolve) -> setTimeout(resolve, n*1000))

  getTextEditorSelector: -> 'atom-text-editor'

  rawCompletions: ({editor, bufferPosition: {row, column}, activatedManually}) ->
    completions
      path: editor.getPath()
      mod: modules.current()
      line: editor.getTextInBufferRange [[row, 0], [row, Infinity]]
      column: column+1
      force: activatedManually || false

  toCompletion: (c, pre) ->
    if c.constructor is String
      c = text: c
    c.replacementPrefix = c._prefix ? pre
    c

  processCompletions: (completions, prefix) ->
    completions.map((c) => @toCompletion c, prefix)

  validScope: ({scopes}) ->
    for scope in scopes.slice 1
      return false if scope.startsWith 'comment'
    return true

  getSuggestions: (data) ->
    return [] unless client.isActive() and @validScope data.scopeDescriptor
    cs = @rawCompletions(data).then ({completions, prefix, mod}) =>
      return @fromCache mod, prefix if not completions?
      @processCompletions completions, prefix
    Promise.race([cs, @sleep(1).then(->[])])

  cache: {}

  updateCache_: (mod) ->
    cacheCompletions(mod).then (cs) =>
      @cache[mod] = cs

  updateCache: debounce ((mod) -> @updateCache_ mod), 1000, true

  fromCache: (mod, prefix) ->
    @updateCache mod
    @processCompletions(@cache[mod] or [], prefix)

  onDidInsertSuggestion: ({editor, suggestion: {type}}) ->
    if type is 'function'
      editor.mutateSelectedText (selection) ->
        return unless selection.isEmpty()
        {row, column} = selection.getBufferRange().start
        if editor.getTextInBufferRange([[row, column], [row, column+1]]) isnt '('
          selection.insertText '()'
        selection.setBufferRange [[row, column+1], [row, column+1]]
