evaluation = require './evaluation'
{client} =   require '../connection'

{completions} = client.import 'completions'

module.exports =
  selector: '.source.julia'
  filterSuggestions: true
  excludeLowerPriority: false

  completionsData: (ed, pos) ->
    module: ed.juliaModule
    cursor: evaluation.cursor pos
    code: ed.getText()
    path: ed.getPath()

  getCompletions: (ed, pos) ->
    completions @completionsData(ed, pos)

  toCompletion: (c) ->
    if c.constructor == String
      text: c
    else
      c

  getSuggestions: ({editor, bufferPosition}) ->
    return [] unless client.isConnected()
    @getCompletions(editor, bufferPosition).then (completions) =>
      completions?.map(@toCompletion) or []
