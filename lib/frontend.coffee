comm = require './connection/comm'
selector = require './ui/selector'

module.exports =
  activate: ->
    comm.handle 'select', ({items}, resolve) =>
      selector.show items, (item) =>
        resolve item: item
