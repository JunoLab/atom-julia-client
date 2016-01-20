http = require 'http'
commands = require './package/commands'

module.exports = JuliaClient =
  connection: require './connection'
  runtime:    require './runtime'
  ui:         require './ui'

  config: require './package/config'

  activate: (state) ->
    x.activate() for x in [commands, @connection, @runtime, @ui]

    try
      if id = localStorage.getItem 'metrics.userId'
        http.get "http://data.junolab.org/hit?id=#{id}&app=atom-julia"

  deactivate: ->
    x.deactivate() for x in [commands, @connection, @runtime, @ui]

  consumeInk: (ink) ->
    commands.ink = ink
    x.consumeInk ink for x in [@connection, @runtime, @ui]

  consumeStatusBar: (bar) ->
    @runtime.consumeStatusBar bar

  completions: -> require './runtime/completions'
