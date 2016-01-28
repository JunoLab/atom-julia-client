child_process = require 'child_process'

client = require './client'
proc = require './process'

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

  repl: -> @term "#{@escpath proc.jlpath()}"

  client: (port) ->
    client.booting()
    @term "#{@escpath proc.jlpath()} -q -P \"import Atom; Atom.connect(#{port})\""
