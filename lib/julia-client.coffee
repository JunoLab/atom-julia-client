etch = require 'etch'

commands = require './package/commands'
config = require './package/config'
menu = require './package/menu'
settings = require './package/settings'
toolbar = require './package/toolbar'
semver = require 'semver'

# IMPORTANT: Update this when a new ink version is required:
INK_VERSION_COMPAT = "^0.11"

module.exports = JuliaClient =
  misc:       require './misc'
  ui:         require './ui'
  connection: require './connection'
  runtime:    require './runtime'

  activate: (state) ->
    etch.setScheduler(atom.views)
    @requireInk =>
      process.env['TERM'] = 'xterm-256color'
      commands.activate @
      x.activate() for x in [menu, @connection, @runtime]
      @ui.activate @connection.client

      settings.updateSettings()

      if atom.config.get('julia-client.firstBoot')
        @ui.layout.queryDefaultLayout()
      else
        if atom.config.get('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp')
          setTimeout (=> @ui.layout.restoreDefaultLayout()), 150

  requireInk: (fn) ->
    if atom.packages.isPackageLoaded("ink")
      inkVersion = atom.packages.loadedPackages["ink"].metadata.version
      if not atom.devMode and not semver.satisfies(inkVersion, INK_VERSION_COMPAT)
        atom.notifications.addWarning "Potentially incompatible `ink` version detected.",
          description:
            """
            Please make sure to upgrade `ink` to a version compatible with `#{INK_VERSION_COMPAT}`.
            The currently installed version is `#{inkVersion}`.

            If you cannot install an appropriate version through the `Packages` menu, open a terminal
            and type in `apm install ink@x.y.z`, where `x.y.z` is satisfies `#{INK_VERSION_COMPAT}`.
            """
          dismissable: true
      fn()
    else
      require('atom-package-deps').install('julia-client')
        .then  -> fn()
        .catch ->
          atom.notifications.addError 'Installing the Ink package failed.',
            detail: 'Julia Client requires the Ink package to run.
                     Please install it manually from the settings view.'
            dismissable: true

  config: config

  deactivate: ->
    x.deactivate() for x in [commands, menu, toolbar, @connection, @runtime, @ui]

  consumeInk: (ink) ->
    commands.ink = ink
    x.consumeInk ink for x in [@connection, @runtime, @ui]

  consumeStatusBar: (bar) ->
    @runtime.consumeStatusBar bar

  consumeToolBar: (bar) -> toolbar.consumeToolBar bar

  consumeGetServerConfig: (conf) -> @connection.consumeGetServerConfig(conf)

  consumeGetServerName: (name) -> @connection.consumeGetServerName(name)

  consumeDatatip: (datatipService) -> @runtime.consumeDatatip datatipService

  provideClient: -> @connection.client

  provideAutoComplete: -> @runtime.provideAutoComplete()

  provideHyperclick: -> @runtime.provideHyperclick()

  handleURI: (parsedURI) -> @runtime.handleURI parsedURI
