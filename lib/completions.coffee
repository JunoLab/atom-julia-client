client = require './connection/client'
run = require './eval'

module.exports =
  selector: '.source.julia'
  inclusionPriority: 0
  filterSuggestions: true
  excludeLowerPriority: false

  completionsData: (ed, pos) ->
    module: ed.juliaModule
    cursor: run.cursor pos
    code: ed.getText()
    path: ed.getPath()

  getCompletions: (ed, pos, f) ->
    client.msg 'completions', @completionsData(ed, pos), (data) ->
      f data

  toCompletion: (c) ->
    if c.constructor == String
      text: c
    else
      c

  getSuggestions: ({editor, bufferPosition}) ->
    return [] unless client.isConnected()
    new Promise (resolve) =>
      @getCompletions editor, bufferPosition, (completions) =>
        resolve completions?.map(@toCompletion) or []
