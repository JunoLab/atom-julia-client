# TODO: some caching to minimise data transfer

{client} =   require '../connection'
modules =    require './modules'
evaluation = require './evaluation'

{completions} = client.import 'completions'

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

  getSuggestions: (data) ->
    return [] unless client.isConnected()
    @rawCompletions(data).then ({completions, prefix}) =>
      completions.map((c) => @toCompletion c, prefix)
