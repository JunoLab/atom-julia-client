child_process = require 'child_process'
client = require './client'

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

  jlpath: -> atom.config.get("julia-client.juliaPath")

  repl: -> @term "#{@escpath @jlpath()}"

  client: (port) ->
    client.booting()
    @term "#{@escpath @jlpath()} -q -P \"import Atom; Atom.connect(#{port})\""
