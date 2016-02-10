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

  toCompletion: (c) ->
    if c.constructor is String
      text: c
    else
      c

  getSuggestions: (data) ->
    return [] unless client.isConnected()
    @rawCompletions(data).then (completions) =>
      completions?.map(@toCompletion) or []
