commands = require './package/commands'
menu = require './package/menu'
toolbar = require './package/toolbar'

module.exports = JuliaClient =
  misc:       require './misc'
  ui:         require './ui'
  connection: require './connection'
  runtime:    require './runtime'

  activate: (state) ->
    commands.activate @
    x.activate() for x in [menu, @connection, @runtime]
    @ui.activate @connection.client

    try
      if id = localStorage.getItem 'metrics.userId'
        require('http').get "http://data.junolab.org/hit?id=#{id}&app=atom-julia"

  deactivate: ->
    x.deactivate() for x in [commands, menu, toolbar, @connection, @runtime, @ui]

  consumeInk: (ink) ->
    commands.ink = ink
    x.consumeInk ink for x in [@connection, @runtime, @ui]

  consumeStatusBar: (bar) ->
    @runtime.consumeStatusBar bar

  consumeToolBar: (bar) -> toolbar.consumeToolBar bar

  provideClient: -> @connection.client

  config: require './package/config'
  completions: -> require './runtime/completions'
