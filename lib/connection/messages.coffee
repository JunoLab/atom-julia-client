client = require './client'
tcp = require './process/tcp'

module.exports =
  activate: ->

    client.handleBasic 'install', =>
      @note?.dismiss()
      atom.notifications.addError "Error installing Atom.jl package",
        description:
          """
          Go to the `Packages -> Juno -> Open REPL` menu and
          run `Pkg.add("Atom")` in Julia, then try again.
          If you still see an issue, please report it to:

          https://discourse.julialang.org/
          """
        dismissable: true

    client.handleBasic 'load', =>
      @note?.dismiss()
      atom.notifications.addError "Error loading Atom.jl package",
        description:
          """
          Go to the `Packages -> Juno -> Open REPL` menu and
          run `Pkg.update()` in Julia, then try again.
          If you still see an issue, please report it to:

          https://discourse.julialang.org/
          """
        dismissable: true

    client.handleBasic 'installing', =>
      @note?.dismiss()
      @note = atom.notifications.addInfo "Installing Julia packages...",
        description:
          """
          Julia's first run will take a couple of minutes.
          See the REPL below for progress.
          """
        dismissable: true
      @openConsole()

    client.handleBasic 'precompiling', =>
      @note?.dismiss()
      @note = atom.notifications.addInfo "Compiling Julia packages...",
        description:
          """
          Julia's first run will take a couple of minutes.
          See the REPL below for progress.
          """
        dismissable: true
      @openConsole()

    client.handle welcome: =>
      @note?.dismiss()
      atom.notifications.addSuccess "Welcome to Juno!",
        description:
          """
          Success! Juno is set up and ready to roll.
          Try entering `2+2` in the REPL below.
          """
        dismissable: true
      @openConsole()

  openConsole: ->
    atom.commands.dispatch atom.views.getView(atom.workspace),
      'julia-client:open-REPL'

  jlNotFound: (path, details = '') ->
    atom.notifications.addError "Julia could not be started.",
      description:
        """
        We tried to launch Julia from: `#{path}`
        This path can be changed in the settings.
        """
      detail: details
      dismissable: true

  connectExternal: ->
    tcp.listen().then (port) ->
      code = "using Atom; using Juno; Juno.connect(#{port})"
      msg = atom.notifications.addInfo "Connect an external process",
        description:
          """
          To connect a Julia process running in the terminal, run the command:

              #{code}
          """
        dismissable: true
        buttons: [{text: 'Copy', onDidClick: -> atom.clipboard.write code}]
      client.onceAttached ->
        if not msg.isDismissed()
          msg.dismiss()
        atom.notifications.addSuccess "Julia is connected."
