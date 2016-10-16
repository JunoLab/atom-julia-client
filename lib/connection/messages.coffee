client = require './client'
tcp = require './process/tcp'

module.exports =
  activate: ->

    client.handleBasic 'install', =>
      @note?.dismiss()
      atom.notifications.addError "Error installing Atom.jl package",
        detail: """
        Go to the Packages → Julia → Open Terminal menu and
        run `Pkg.add("Atom")` in Julia, then try again.
        If you still see an issue, please report it to:
            julia-users@googlegroups.com
        """
        dismissable: true

    client.handleBasic 'load', =>
      @note?.dismiss()
      atom.notifications.addError "Error loading Atom.jl package",
        detail: """
        Go to the Packages → Julia → Open Terminal menu and
        run `Pkg.update()`in Julia, then try again.
        If you still see an issue, please report it to:
            http://discuss.junolab.org/
        """
        dismissable: true

    client.handleBasic 'installing', =>
      @note?.dismiss()
      @note = atom.notifications.addInfo "Installing Julia packages...",
        detail: """
        Julia's first run will take a couple of minutes.
        See the console below for progress.
        """
        dismissable: true
      @openConsole()

    client.handleBasic 'precompiling', =>
      @note?.dismiss()
      @note = atom.notifications.addInfo "Compiling Julia packages...",
        detail: """
        Julia's first run will take a couple of minutes.
        See the console below for progress.
        """
        dismissable: true
      @openConsole()

    client.handle welcome: =>
      @note?.dismiss()
      atom.notifications.addSuccess "Welcome to Juno!",
        detail: """
        Success! Juno is set up and ready to roll.
        Try entering `2+2` in the console below.
        """
        dismissable: true
      @openConsole()

  openConsole: ->
    atom.commands.dispatch atom.views.getView(atom.workspace),
      'julia-client:open-console'

  jlNotFound: (path, details = '') ->
    atom.notifications.addError "Julia could not be started.",
      detail: """
      We tried to launch Julia from:
      #{path}

      This path can be changed in the settings.

      """ + if details isnt ''
        """
        Details:
          #{details}
        """
      else
        ""
      dismissable: true

  connectExternal: ->
    tcp.listen().then (port) ->
      code = "using Juno; Juno.connect(#{port})"
      msg = atom.notifications.addInfo "Connect an external process",
        detail: """
        To connect a Julia process running in the terminal,
        run the command:
        -
            #{code}
        """
        dismissable: true
        buttons: [{text: 'Copy', onDidClick: -> atom.clipboard.write code}]
      client.onceAttached ->
        if not msg.isDismissed()
          msg.dismiss()
          atom.notifications.addSuccess "Julia is connected."
