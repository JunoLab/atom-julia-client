child_process = require 'child_process'
client = require './client'
net = require 'net'
path = require 'path'
fs = require 'fs'

module.exports =

  bundledExe: ->
    res = path.dirname(atom.config.resourcePath)
    exe = if process.platform is 'win32' then 'julia.exe' else 'julia'
    p = path.join res, "julia/bin/#{exe}"
    if fs.existsSync p then p

  packageDir: (s...) ->
    path.join __dirname, '..', '..', s...

  initialiseClient: (f) ->
    atom.config.unset('julia-client.initialiseClient')
    if (jlpath = @bundledExe())
      proc = child_process.spawn jlpath, [@packageDir('jl', 'caches.jl')]
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

  checkExe: (path, cb) ->
    if fs.existsSync(path)
      cb true
      return
    which = if process.platform is 'win32' then 'where' else 'which'
    proc = child_process.spawn which, [path]
    proc.on 'exit', (status) ->
      cb status == 0

  jlNotFound: (path) ->
    atom.notifications.addError "Julia could not be found.",
      detail: """
      We tried to launch Julia from:
      #{path}

      This path can be changed in the settings.
      """
      dismissable: true

  useWrapper: true

  start: (port, cons) ->
    return if @proc?
    client.booting()

    @checkExe @jlpath(), (exists) =>
      if not exists
        @jlNotFound @jlpath()
        client.cancelBoot()
        return

      if atom.config.get 'julia-client.initialiseClient'
        return @initialiseClient => @start port, cons
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
    if process.platform is 'win32' and atom.config.get("julia-client.enablePowershellWrapper")
      @useWrapper = parseInt(child_process.spawnSync("powershell", ["-NoProfile", "$PSVersionTable.PSVersion.Major"]).output[1].toString()) > 2
      if @useWrapper
        @proc = child_process.spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "bypass",
                                    "& \"#{__dirname}\\spawnInterruptibleJulia.ps1\" -cwd #{@workingDir()} -port #{port} -jlpath \"#{@jlpath()}\" -boot \"#{@packageDir('jl', 'boot.jl')}\""])
        return
      else
        cons.c.out "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."
    @proc = child_process.spawn(@jlpath(), [@packageDir("jl", "boot.jl"), port], cwd: @workingDir())

  interruptJulia: ->
    if process.platform == 'win32' && @useWrapper
      @sendSignalToWrapper('SIGINT')
    else
      @proc.kill('SIGINT')

  killJulia: ->
      @proc.kill()

  sendSignalToWrapper: (signal) ->
    wrapper = net.connect(port: 26992)
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()
