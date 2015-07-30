process = require 'child_process'
comm = require './comm'

module.exports =
  start: (port, cons) ->
    return if @proc?
    comm.booting()
    @proc = process.spawn 'julia', ['-e', "import Atom; @sync Atom.connect(#{port})"]
    @proc.on 'exit', (code, signal) =>
      console.log "Julia Exit: #{code}, #{signal}"
      @proc = null
    @proc.stdout.on 'data', (data) =>
      text = data.toString().trim()
      if text then cons.out text
    @proc.stderr.on 'data', (data) =>
      text = data.toString().trim()
      if text then cons.err text
