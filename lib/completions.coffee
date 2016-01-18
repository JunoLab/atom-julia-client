client = require './connection/client'
run = require './eval'

module.exports =
  selector: '.source.julia'
  filterSuggestions: true
  excludeLowerPriority: false

  client: client.import ['completions'], true

  completionsData: (ed, pos) ->
    module: ed.juliaModule
    cursor: run.cursor pos
    code: ed.getText()
    path: ed.getPath()

  getCompletions: (ed, pos) ->
    @client.completions @completionsData(ed, pos)

  toCompletion: (c) ->
    if c.constructor == String
      text: c
    else
      c

  getSuggestions: ({editor, bufferPosition}) ->
    return [] unless client.isConnected()
    new Promise (resolve) =>
      @getCompletions(editor, bufferPosition).then (completions) =>
        resolve completions?.map(@toCompletion) or []
