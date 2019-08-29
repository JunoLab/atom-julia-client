child_process = require 'child_process'
net = require 'net'

tcp = require './process/tcp'
client = require './client'
{paths} = require '../misc'

disrequireClient = (a, f) -> client.disrequire a, f

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

  terminal: -> atom.config.get("julia-client.consoleOptions.terminal")

  defaultShell: ->
    sh = process.env["SHELL"]
    if sh?
      sh
    else if process.platform == 'win32'
      'powershell.exe'
    else
      'bash'

  defaultTerminal: ->
    if process.platform == 'win32'
      'cmd /C start cmd /C'
    else
      'x-terminal-emulator -e'

  repl: -> @term "#{@escpath paths.jlpath()}"

  connectCommand: ->
    tcp.listen().then (port) =>
      "#{@escpath paths.jlpath()} #{client.clargs().join(' ')} #{paths.script('boot_repl.jl')} #{port}"

  connectedRepl: -> @connectCommand().then (cmd) => @term cmd
