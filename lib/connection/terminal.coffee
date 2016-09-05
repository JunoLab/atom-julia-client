child_process = require 'child_process'
net = require 'net'

client = require './client'
{paths} = require '../misc'

module.exports =

  escpath: (p) -> '"' + p + '"'
  escape: (sh) -> sh.replace(/"/g, '\\"')

  exec: (sh) ->
    child_process.exec sh, (err, stdout, stderr) ->
      if err?
        console.log err

  term: (sh) ->
    switch process.platform
      when "darwin"
        @exec "osascript -e 'tell application \"Terminal\" to activate'"
        @exec "osascript -e 'tell application \"Terminal\" to do script \"#{@escape(sh)}\"'"
      when "win32"
        @exec "#{@terminal()} \"#{sh}\""
      else
        @exec "#{@terminal()} \"#{@escape(sh)}\""

  terminal: -> atom.config.get("julia-client.terminal")

  defaultTerminal: ->
    if process.platform == 'win32'
      'cmd /C start cmd /C'
    else
      'x-terminal-emulator -e'

  repl: -> @term "#{@escpath paths.jlpath()}"

  connectPort: (port) ->
    sock = net.connect port
    client.readStream sock
    client.attach message: (m) -> sock.write JSON.stringify m
    sock.on 'end', -> client.detach()
    sock.on 'error', -> client.detach()

  connectPortUI: ->
    {console: cons} = require '../runtime'
    cons.info 'Please enter a port:'
    cons.input().then (input) =>
      port = parseInt input
      @connectPort port
      client.import('ping')()
        .then -> atom.notifications.addSuccess "Connected to Julia on #{port}"
        .catch -> atom.notifications.addError "Couldn't connect to Julia on #{port}"
