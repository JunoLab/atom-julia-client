child_process = require 'child_process'
net =           require 'net'
path =          require 'path'
fs =            require 'fs'

{paths} = require '../misc'
client = require './client'
tcp = require './tcp'

module.exports =

  activate: ->
    client.onDisconnected ->
      if @useWrapper and @proc
        @proc.kill()

    client.handle 'welcome', =>
      @note?.dismiss()
      atom.notifications.addSuccess "Welcome to Juno!",
        detail: """
        Success! Juno is set up and ready to roll.
        Try entering `2+2` in the console below.
        """
        dismissable: true

  bundledExe: ->
    res = path.dirname atom.config.resourcePath
    p = path.join res, 'julia', 'bin', @executable()
    if fs.existsSync p then p

  executable: ->
    if process.platform is 'win32' then 'julia.exe' else 'julia'

  isBundled: -> !!@bundledExe()

  packageDir: (s...) ->
    packageRoot = path.resolve __dirname, '..', '..'
    resourcePath = atom.config.resourcePath
    if path.extname(resourcePath) is '.asar' and packageRoot.indexOf(resourcePath) is 0
        packageRoot = path.join("#{resourcePath}.unpacked", 'node_modules', 'julia-client')
    path.join packageRoot, s...

  script: (s...) -> @packageDir 'script', s...

  withWorkingDir: (fn) ->
    dirs = atom.workspace.project.getDirectories()
    # default to HOME as working dir for julia
    wd = process.env.HOME || process.env.USERPROFILE
    if dirs.length > 0
      # use the first open project folder (or its parent folder for files) if
      # it is valid
      fs.stat dirs[0].path, (err, stats) =>
        if not err?
          if stats.isFile()
            wd = path.dirname dirs[0].path
          else
            wd = dirs[0].path
        fn wd
    else
      fn wd

  jlNotFound: (path) ->
    atom.notifications.addError "Julia could not be found.",
      detail: """
      We tried to launch Julia from:
      #{path}

      This path can be changed in the settings.
      """
      dismissable: true

  openConsole: ->
    atom.commands.dispatch atom.views.getView(atom.workspace),
      'julia-client:open-console'

  bootErr: (err) ->
    @note?.dismiss()
    switch err
      when 'juno-err-install'
        atom.notifications.addError "Error installing Atom.jl package",
          detail: """
          Go to the Packages → Julia → Open Terminal menu and
          run `Pkg.add("Atom")` in Julia, then try again.
          If you still see an issue, please report it to:
              julia-users@googlegroups.com
          """
          dismissable: true
      when 'juno-err-load'
        atom.notifications.addError "Error loading Atom.jl package",
          detail: """
          Go to the Packages → Julia → Open Terminal menu and
          run `Pkg.update()`in Julia, then try again.
          If you still see an issue, please report it to:
              http://discuss.junolab.org/
          """
          dismissable: true
      when 'juno-err-installing'
        @note = atom.notifications.addInfo "Installing Julia packages...",
          detail: """
          Julia's first run will take a couple of minutes.
          See the console below for progress.
          """
          dismissable: true
        @openConsole()
      when 'juno-err-precompiling'
        @note = atom.notifications.addInfo "Compiling Julia packages...",
          detail: """
          Julia's first run will take a couple of minutes.
          See the console below for progress.
          """
          dismissable: true
        @openConsole()
      else client.stderr err

  init: (conn) ->
    conn.interrupt = => @interrupt conn.proc
    conn.kill = => @kill conn.proc
    conn.stdin = (data) -> conn.proc.stdin.write data
    client.connected conn

  start: (port) ->
    client.booting()
    paths.getVersion()
      .then =>
        @spawnJulia port, (proc) =>
          proc.on 'exit', (code, signal) =>
            client.stderr "Julia has stopped"
            if not @useWrapper then client.stderr ": #{code}, #{signal}"
            client.cancelBoot()
          proc.stdout.on 'data', (data) => client.stdout data.toString()
          proc.stderr.on 'data', (data) =>
            text = data.toString()
            if text.startsWith 'juno-err'
              @bootErr text
              return
            client.stderr text

          tcp.next().then (conn) =>
            conn.proc = proc
            @init conn
      .catch =>
        @jlNotFound paths.jlpath()
        client.cancelBoot()

  spawnJulia: (port, fn) ->
    @withWorkingDir (workingdir) =>
      if process.platform is 'win32' and atom.config.get("julia-client.enablePowershellWrapper")
        @useWrapper = parseInt(child_process.spawnSync("powershell",
                                                      ["-NoProfile", "$PSVersionTable.PSVersion.Major"])
                                            .output[1].toString()) > 2
        if @useWrapper
          @getFreePort =>
            # ordering of the last two arguments is important!
            jlargs = [client.clargs()..., "-i", '`"' + @script('boot.jl') + '`"', port]
            proc = child_process.spawn("powershell",
                                        ["-NoProfile", "-ExecutionPolicy", "bypass",
                                         "& \"#{@script "spawnInterruptible.ps1"}\"
                                         -cwd \"#{workingdir}\"
                                         -wrapPort #{@wrapPort}
                                         -jlpath \"#{paths.jlpath()}\"
                                         -jlargs #{jlargs}"])
            fn proc
          return
        else
          client.stderr "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."
      proc = child_process.spawn paths.jlpath(),
        [client.clargs()..., "-i", @script("boot.jl"), port],
        cwd: workingdir
      fn proc

  getFreePort: (fn) ->
    server = net.createServer()
    server.listen 0, '127.0.0.1', =>
      @wrapPort = server.address().port
      server.close()
      fn()

  interrupt: (proc) ->
    if @useWrapper
      @sendSignalToWrapper('SIGINT')
    else
      proc.kill('SIGINT')

  kill: (proc) ->
    if @useWrapper
      @sendSignalToWrapper('KILL')
    else
      proc.kill()

  sendSignalToWrapper: (signal) ->
    wrapper = net.connect(port: @wrapPort)
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()
