child_process = require 'child_process'

module.exports =

  escape: (sh) -> sh.replace('"', '\\"')

  exec: (sh) ->
    child_process.exec sh, (err, stdout, stderr) ->
      if err?
        console.log err

  term: (sh) ->
    if process.platform == "darwin"
      @exec "osascript -e 'tell application \"Terminal\" to activate'"
      @exec "osascript -e 'tell application \"Terminal\" to do script \"#{@escape(sh)}\"'"
    else if process.platform = "windows"
      @exec "cmd /C start cmd /C #{sh}"
    else
      console.log 'unsupported platform'

  jlpath: () -> atom.config.get("julia-client.juliaPath")

  commands: (subs) ->
    subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': => @term @jlpath()
