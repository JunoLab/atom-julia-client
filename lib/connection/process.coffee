process = require 'child_process'
client = require './client'
net = require 'net'

module.exports =
  jlpath: () -> atom.config.get("julia-client.juliaPath")
  # TODO: this is very naïve.
  jlargs: () -> atom.config.get("julia-client.juliaArguments").split ' '

  start: (port, cons) ->
    return if @proc?
    client.booting()
    @spawnJulia(port)
    @onStart()
    @proc.on 'exit', (code, signal) =>
      cons.c.err "Julia has stopped: #{code}, #{signal}"
      cons.c.input() unless cons.c.isInput
      @onStop()
      @proc = null
      client.cancelBoot()
    @proc.stdout.on 'data', (data) =>
      text = data.toString()
      if text then cons.c.out text
    @proc.stderr.on 'data', (data) =>
      text = data.toString()
      if text then cons.c.err text

  onStart: ->
    @cmds = atom.commands.add 'atom-workspace',
      'julia-client:kill-julia': => @killJulia()
      'julia-client:interrupt-julia': => @interruptJulia()

  onStop: ->
    @cmds?.dispose()

  spawnJulia: (port) ->
    switch process.platform
      when 'win32'
        @proc = process.spawn("powershell", ["-ExecutionPolicy", "bypass", "& \"#{__dirname}\\spawnInterruptibleJulia.ps1\" -port #{port} -jlpath \"#{@jlpath()}\" -jloptions \"#{@jlargs().join(' ')}\""])
      else
        @proc = process.spawn(@jlpath(), [@jlargs()..., '-e', "import Atom; @sync Atom.connect(#{port})"])

  interruptJulia: ->
    switch process.platform
      when 'win32'
        @sendSignalToWrapper('SIGINT')
      else
        @proc.kill('SIGINT')

  killJulia: ->
    switch process.platform
      when 'win32'
        @sendSignalToWrapper('KILL')
      else
        @proc.kill()

  sendSignalToWrapper: (signal) ->
    wrapper = net.connect(port: 26992)
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()
