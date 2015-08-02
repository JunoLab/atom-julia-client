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
    @proc.on 'exit', (code, signal) =>
      cons.err "Julia has stopped: #{code}, #{signal}"
      cons.input()
      @proc = null
    @proc.stdout.on 'data', (data) =>
      text = data.toString().trim()
      if text then cons.out text
    @proc.stderr.on 'data', (data) =>
      text = data.toString().trim()
      if text then cons.err text
