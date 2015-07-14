child_process = require 'child_process'

module.exports =

  escpath: (p) -> '"' + p + '"'
  escape: (sh) -> sh.replace(/"/g, '\\"')

  exec: (sh) ->
    child_process.exec sh, (err, stdout, stderr) ->
      if err?
        console.log err

  term: (sh) ->
    if process.platform == "darwin"
      @exec "osascript -e 'tell application \"Terminal\" to activate'"
      @exec "osascript -e 'tell application \"Terminal\" to do script \"#{@escape(sh)}\"'"
    else if process.platform = "windows"
      @exec "cmd /C start cmd /C #{@escape(sh)}"
    else
      console.log 'unsupported platform'

  jlpath: () -> atom.config.get("julia-client.juliaPath")

  repl: -> @term @escpath @jlpath()

  client: (port) -> @term "#{@escpath @jlpath()} -q -P \"using AtomClient; AtomClient.connect(#{port})\""
