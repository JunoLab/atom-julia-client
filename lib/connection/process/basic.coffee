net = require 'net'
child_process = require 'child_process'

{paths} = require '../../misc'
client = require '../client'

module.exports =

  freePort: ->
    new Promise (resolve) ->
      server = net.createServer()
      server.listen 0, '127.0.0.1', ->
        port = server.address().port
        server.close()
        resolve port

  crossStreams: (proc) ->
    proc.stdout.on 'data', (data) -> client.stdout data.toString()
    proc.stderr.on 'data', (data) -> client.stderr data.toString()

  socket: (proc, port) ->
    new Promise (resolve) ->
      proc.stderr.on 'data', f = (data) ->
        if data.toString() == 'juno-msg-ready'
          proc.stderr.removeListener 'data', f
          resolve net.connect port

  getUnix: (path, args) ->
    @freePort().then (port) =>
      proc = child_process.spawn path, [args..., paths.script('boot.jl'), port]
      @crossStreams proc

      onExit: (f) ->
        proc.on 'exit', f
        {dispose: -> proc.removeListener('exit', f)}
      stdin: (data) -> proc.stdin.write data
      kill: -> proc.kill()
      interrupt: -> proc.kill 'SIGINT'
      socket: @socket proc, port

  # Windows Stuff

  sendSignalToWrapper: (signal, port) ->
    wrapper = net.connect({port})
    wrapper.setNoDelay()
    wrapper.write(signal)
    wrapper.end()

  getWindows: (path, args) ->
    useWrapper = atom.config.get "julia-client.enablePowershellWrapper"
    useWrapper = useWrapper && parseInt(child_process.spawnSync("powershell",
                                                                ["-NoProfile", "$PSVersionTable.PSVersion.Major"])
                                                     .output[1].toString()) > 2
    if !useWrapper
      client.stderr "PowerShell version < 3 encountered. Running without wrapper (interrupts won't work)."
      @getUnix path, args
    else
      @freePort().then (port) =>
        wrapPort = port+1
        jlargs = [args..., '`"' + paths.script('boot.jl') + '`"', port]
        proc = child_process.spawn("powershell",
                                    ["-NoProfile", "-ExecutionPolicy", "bypass",
                                     "& \"#{paths.script "spawnInterruptible.ps1"}\"
                                     -wrapPort #{wrapPort}
                                     -jlpath \"#{path}\"
                                     -jlargs #{jlargs}"])
        @crossStreams proc

        onExit: (f) ->
          proc.on 'exit', f
          {dispose: -> proc.removeListener('exit', f)}
        stdin: (data) -> proc.stdin.write data
        kill: => @sendSignalToWrapper 'KILL', wrapPort
        interrupt: => @sendSignalToWrapper 'SIGINT', wrapPort
        socket: @socket proc, port

  get: (a...) ->
    if process.platform is 'win32'
      @getWindows a...
    else
      @getUnix a...
