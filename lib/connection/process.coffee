process = require 'child_process'
comm = require './comm'

module.exports =
  jlpath: () -> atom.config.get("julia-client.juliaPath")
  # TODO: this is very naïve.
  jlargs: () -> atom.config.get("julia-client.juliaArguments").split ' '

  start: (port, cons) ->
    return if @proc?
    comm.booting()
    @proc = process.spawn @jlpath(), [@jlargs()..., '-e', "import Atom; @sync Atom.connect(#{port})"]
    @onStart()
    @proc.on 'exit', (code, signal) =>
      cons.c.err "Julia has stopped: #{code}, #{signal}"
      cons.c.input() unless cons.c.isInput
      @onStop()
      @proc = null
      comm.notBooting()
    @proc.stdout.on 'data', (data) =>
      text = data.toString().trim()
      if text then cons.c.out text
    @proc.stderr.on 'data', (data) =>
      text = data.toString().trim()
      if text then cons.c.err text

  onStart: ->
    @cmds = atom.commands.add 'atom-workspace',
      'julia-client:kill-julia': => @proc.kill()
      'julia-client:interrupt-julia': => @proc.kill 'SIGINT'

  onStop: ->
    @cmds?.dispose()
