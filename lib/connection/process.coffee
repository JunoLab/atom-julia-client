child_process = require 'child_process'
client = require './client'
net = require 'net'

module.exports =
  workingDir: ->
    paths = atom.workspace.project.getDirectories()
    if paths.length == 1
      paths[0].path
    else
      process.env.HOME || process.env.USERPROFILE

  jlpath: -> atom.config.get("julia-client.juliaPath")
  # TODO: this is very naïve.
  jlargs: -> atom.config.get("julia-client.juliaArguments").split ' '

  start: (port, cons) ->
    return if @proc?
    client.booting()
    @spawnJulia(port, cons)
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

  spawnJulia: (port, cons) ->
    if process.platform == 'win32'
      if parseInt(child_process.spawnSync("powershell", ["-NoProfile", "$PSVersionTable.PSVersion.Major"]).output[1].toString()) > 2
        @proc = child_process.spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "bypass", "& \"#{__dirname}\\spawnInterruptibleJulia.ps1\" -port #{port} -jlpath \"#{@jlpath()}\" -jloptions \"#{@jlargs().join(' ')}\""], cwd: @workingDir())
        return
      else
        cons.c.out "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."

    @proc = child_process.spawn(@jlpath(), [@jlargs()..., '-e', "import Atom; @sync Atom.connect(#{port})"], cwd: @workingDir())
    return

  interruptJulia: ->
    switch process.platform
      when 'win32' && @useWrapper
        @sendSignalToWrapper('SIGINT')
      else
        @proc.kill('SIGINT')

  killJulia: ->
    switch process.platform
      when 'win32' && @useWrapper
        @sendSignalToWrapper('KILL')
      else
        @proc.kill()

  sendSignalToWrapper: (signal) ->
    wrapper = net.connect(port: 26992)
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()
