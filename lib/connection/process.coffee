child_process = require 'child_process'
client = require './client'
net = require 'net'
path = require 'path'
fs = require 'fs'

module.exports = jlprocess =

  activate: ->
    @cmds = atom.commands.add 'atom-workspace',
      'julia-client:kill-julia': => @killJulia()
      'julia-client:interrupt-julia': => @interruptJulia()

  deactivate: ->
    @cmds.dispose()

  bundledExe: ->
    res = path.dirname(atom.config.resourcePath)
    exe = if process.platform is 'win32' then 'julia.exe' else 'julia'
    p = path.join res, "julia/bin/#{exe}"
    if fs.existsSync p then p

  packageDir: (s...) ->
    path.join __dirname, '..', '..', s...

  script: (s) -> @packageDir 'script', s

  initialiseClient: (f) ->
    atom.config.unset('julia-client.initialiseClient')
    if (jlpath = @bundledExe())
      proc = child_process.spawn jlpath, [@script 'caches.jl']
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

  start: (port, cons, boot = true) ->
    return if @proc?
    boot && client.booting()

    @checkExe @jlpath(), (exists) =>
      if not exists
        @jlNotFound @jlpath()
        client.cancelBoot()
        return

      if atom.config.get 'julia-client.initialiseClient'
        return @initialiseClient => @start port, cons, false
      @spawnJulia(port, cons)
      @proc.on 'exit', (code, signal) =>
        cons.c.err "Julia has stopped"
        if not @useWrapper then cons.c.err ": #{code}, #{signal}"
        cons.c.input() unless cons.c.isInput
        @proc = null
        client.cancelBoot()
      @proc.stdout.on 'data', (data) =>
        text = data.toString()
        if text then cons.c.out text
      @proc.stderr.on 'data', (data) =>
        text = data.toString()
        if text then cons.c.err text

  spawnJulia: (port, cons) ->
    if process.platform is 'win32' and atom.config.get("julia-client.enablePowershellWrapper")
      @useWrapper = parseInt(child_process.spawnSync("powershell", ["-NoProfile", "$PSVersionTable.PSVersion.Major"]).output[1].toString()) > 2
      if @useWrapper
        @proc = child_process.spawn("powershell",
                                    ["-NoProfile", "-ExecutionPolicy", "bypass",
                                     "& \"#{@script "spawnInterruptible.ps1"}\"
                                      -cwd #{@workingDir()} -port #{port}
                                      -jlpath \"#{@jlpath()}\"
                                      -boot \"#{@script 'boot.jl'}\""])
        return
      else
        cons.c.out "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."
    @proc = child_process.spawn(@jlpath(), [@script("boot.jl"), port], cwd: @workingDir())

  # TODO: make 'kill' try to exit gracefully first

  require: (f) ->
    if not @proc
      atom.notifications.addError "There's no Julia process running.",
        detail: "Try starting one by evaluating something."
    else
      f()

  interruptJulia: ->
    @require =>
      if @useWrapper
        @sendSignalToWrapper('SIGINT')
      else
        @proc.kill('SIGINT')

  killJulia: ->
    @require =>
      if @useWrapper
        @sendSignalToWrapper('KILL')
      else
        @proc.kill()

  sendSignalToWrapper: (signal) ->
    wrapper = net.connect(port: 26992)
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()

client.onDisconnected ->
  if jlprocess.useWrapper and jlprocess.proc
    jlprocess.proc.kill()
