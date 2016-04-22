child_process = require 'child_process'
net =           require 'net'
path =          require 'path'
fs =            require 'fs'

client = require './client'
tcp = require './tcp'

module.exports =

  activate: ->
    client.onDisconnected ->
      if @useWrapper and @proc
        @proc.kill()

    client.handle 'welcome', ->
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
    paths = atom.workspace.project.getDirectories()
    # default to HOME as working dir for julia
    wd = process.env.HOME || process.env.USERPROFILE
    if paths.length > 0
      # use the first open project folder (or its parent folder for files) if
      # it is valid
      fs.stat paths[0].path, (err, stats) =>
        if not err?
          if stats.isFile()
            wd = path.dirname paths[0].path
          else
            wd = paths[0].path
        fn wd
    else
      fn wd

  jlpath: ->
    p = atom.config.get("julia-client.juliaPath")
    if p == '[bundle]' then p = @bundledExe()
    p

  checkPath: (p) ->
    new Promise (resolve, reject) =>
      # check whether path exists
      fs.stat p, (err, stats) =>
        if not err
          # and is a file
          if stats.isFile() then resolve(); return
          # if it isn't, look for a file called `julia(.exe)`
          fs.readdir p, (err, files) =>
            if err or files.indexOf(@executable()) < 0 then reject(); return
            newpath = path.join p, @executable()
            # check whether that file is no directory
            fs.stat newpath, (err, fstats) =>
              # change the `Julia Path` setting to that new path and carry on
              if not fstats.isFile() then reject(); return
              atom.config.set 'julia-client.juliaPath', newpath
              resolve()
        # fallback to calling `which` or `where` on the path
        else
          which = if process.platform is 'win32' then 'where' else 'which'
          proc = child_process.spawn which, [p]
          proc.on 'exit', (status) ->
            if status is 0 then resolve() else reject()

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
        atom.notifications.addInfo "Installing Julia packages...",
          detail: """
          Julia's first run will take a couple of minutes.
          See the console below for progress.
          """
        @openConsole()
      when 'juno-err-precompiling'
        atom.notifications.addInfo "Compiling Julia packages...",
          detail: """
          Julia's first run will take a couple of minutes.
          See the console below for progress.
          """
        @openConsole()
      else client.stderr err

  init: (conn) ->
    conn.interrupt = => @interrupt conn.proc
    conn.kill = => @kill conn.proc
    conn.stdin = (data) -> conn.proc.stdin.write data
    client.connected conn

  start: (port) ->
    client.booting()
    @checkPath @jlpath()
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
        @jlNotFound @jlpath()
        client.cancelBoot()

  spawnJulia: (port, fn) ->
    @withWorkingDir (workingdir) =>
      if process.platform is 'win32' and atom.config.get("julia-client.enablePowershellWrapper")
        @useWrapper = parseInt(child_process.spawnSync("powershell",
                                                      ["-NoProfile", "$PSVersionTable.PSVersion.Major"])
                                            .output[1].toString()) > 2
        if @useWrapper
          @getFreePort =>
            proc = child_process.spawn("powershell",
                                        ["-NoProfile", "-ExecutionPolicy", "bypass",
                                         "& \"#{@script "spawnInterruptible.ps1"}\"
                                         -cwd \"#{workingdir}\"
                                         -port #{port}
                                         -wrapPort #{@wrapPort}
                                         -jlpath \"#{@jlpath()}\"
                                         -boot \"#{@script 'boot.jl'}\""])
            fn proc
          return
        else
          client.stderr "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."
      proc = child_process.spawn(@jlpath(), ["-i", @script("boot.jl"), port], cwd: workingdir)
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
