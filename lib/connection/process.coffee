child_process = require 'child_process'
client = require './client'
net = require 'net'
path = require 'path'
fs = require 'fs'

module.exports =

  bundledExe: ->
    res = path.dirname(atom.config.resourcePath)
    p = if process.platform == 'darwin'
      path.join res, 'julia/bin/julia'
    if fs.existsSync p then p

  initialiseClient: (f) ->
    packageDir = path.join __dirname, '..', '..'
    atom.config.unset('julia-client.initialiseClient')
    if (jlpath = @bundledExe())
      proc = child_process.spawn jlpath, [path.join(packageDir, 'jl', 'caches.jl')]
      proc.on 'exit', ->
        f()
    else
      f()

  workingDir: ->
    paths = atom.workspace.project.getDirectories()
    if paths.length == 1
      paths[0].path
    else
      process.env.HOME || process.env.USERPROFILE

  jlpath: -> atom.config.get("julia-client.juliaPath")

  useWrapper: true

  start: (port, cons) ->
    return if @proc?
    if atom.config.get 'julia-client.initialiseClient'
      return @initialiseClient => @start port, cons
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
      @useWrapper = atom.config.get("julia-client.enablePowershellWrapper") &&
                    parseInt(child_process.spawnSync("powershell", ["-NoProfile", "$PSVersionTable.PSVersion.Major"]).output[1].toString()) > 2
      if @useWrapper
        @proc = child_process.spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "bypass", "& \"#{__dirname}\\spawnInterruptibleJulia.ps1\" -port #{port} -jlpath \"#{@jlpath()}\""], cwd: @workingDir())
        return
      else
        cons.c.out "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."
    @proc = child_process.spawn(@jlpath(), ['-e', "import Atom; @sync Atom.connect(#{port})"], cwd: @workingDir())

  interruptJulia: ->
    if  process.platform == 'win32' && @useWrapper
      @sendSignalToWrapper('SIGINT')
    else
      @proc.kill('SIGINT')

  killJulia: ->
    if process.platform == 'win32' && @useWrapper
      @sendSignalToWrapper('KILL')
    else
      @proc.kill()

  sendSignalToWrapper: (signal) ->
    wrapper = net.connect(port: 26992)
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()
