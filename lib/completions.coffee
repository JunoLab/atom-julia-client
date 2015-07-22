comm = require './connection/comm'
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
    comm.msg 'completions', @completionsData(ed, pos), (data) ->
      f data

  toCompletion: (c) ->
    if c.constructor == String
      text: c
    else
      c

  getSuggestions: ({editor, bufferPosition}) ->
    return [] unless comm.isConnected()
    new Promise (resolve) =>
      @getCompletions editor, bufferPosition, (completions) =>
        resolve completions?.map(@toCompletion) or []
