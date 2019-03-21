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
  labels: ['workspace-center']
  filterSuggestions: false
  excludeLowerPriority: false

  sleep: (n) ->
    new Promise((resolve) -> setTimeout(resolve, n*1000))

  getTextEditorSelector: -> 'atom-text-editor'

  rawCompletions: ({editor, bufferPosition: {row, column}, activatedManually}) ->
    completions
      path: editor.getPath()
      mod: modules.current()
      line: editor.getTextInBufferRange [[row, 0], [row, column]]
      column: column+1
      force: activatedManually || false

  toCompletion: (c, pre) ->
    if c.constructor is String
      c = text: c
    c.replacementPrefix = c._prefix ? pre
    if c.type is 'path' then c.iconHTML = '<i class="icon-file-code"></i>'
    c

  processCompletions: (completions, prefix) ->
    completions.map((c) => @toCompletion c, prefix)

  validScope: ({scopes}) ->
    for scope in scopes.slice 1
      return false if scope.startsWith 'comment'
    return true

  getSuggestions: (data) ->
    return [] unless client.isActive() and @validScope data.scopeDescriptor
    # don't show suggestions if preceding char is a space (unless activate manually)
    if not data.activatedManually
      point = data.bufferPosition
      if point.column == 0
        return []
      else
        text = data.editor.getTextInBufferRange([[point.row, point.column - 1], point])
        if text.match(/\s/)
          return []
    cs = @rawCompletions(data).then ({completions, prefix, mod}) =>
      try
        @processCompletions completions, prefix
      catch err
        []
    Promise.race([cs, @sleep(1)])

  onDidInsertSuggestion: ({editor, suggestion: {type}}) ->
    if type is 'function' and !atom.config.get('julia-client.uiOptions.noAutoParenthesis')
      editor.mutateSelectedText (selection) ->
        return unless selection.isEmpty()
        {row, column} = selection.getBufferRange().start
        if editor.getTextInBufferRange([[row, column], [row, column+1]]) isnt '('
          selection.insertText '()'
        selection.setBufferRange [[row, column+1], [row, column+1]]
