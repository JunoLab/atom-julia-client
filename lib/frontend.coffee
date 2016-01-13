client = require './connection/client'
selector = require './ui/selector'

module.exports =
  activate: ->
    client.handle 'select', (items) ->
      new Promise (resolve) ->
        selector.show items, (item) =>
          resolve item

    client.handle 'electronexe', ->
      process.execPath
