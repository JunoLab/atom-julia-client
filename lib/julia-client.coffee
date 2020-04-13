etch = require 'etch'

commands = require './package/commands'
config = require './package/config'
menu = require './package/menu'
settings = require './package/settings'
release = require './package/release-note'
toolbar = require './package/toolbar'
semver = require 'semver'

# TODO: Update me when tagging a new relase:
INK_VERSION_COMPAT  = "^0.12.3"
# TODO: Update me when tagging a new relase with a release note
LATEST_RELEASE_NOTE_VERSION  = "0.12.0"

INK_LINK            = '[`ink`](https://github.com/JunoLab/atom-ink)'
LANGUAGE_JULIA_LINK = '[`language-julia`](https://github.com/JuliaEditorSupport/atom-language-julia)'

module.exports = JuliaClient =
  misc:       require './misc'
  ui:         require './ui'
  connection: require './connection'
  runtime:    require './runtime'

  activate: (state) ->
    etch.setScheduler(atom.views)
    process.env['TERM'] = 'xterm-256color'
    commands.activate @
    x.activate() for x in [menu, @connection, @runtime]
    @ui.activate @connection.client

    @requireDeps =>
      settings.updateSettings()

      if atom.config.get('julia-client.firstBoot')
        @ui.layout.queryDefaultLayout()
      else
        if atom.config.get('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp')
          setTimeout (=> @ui.layout.restoreDefaultLayout()), 150

      try
        v = atom.config.get('julia-client.currentVersion')
        if not semver.gte(v, LATEST_RELEASE_NOTE_VERSION)
          minor = semver.minor(LATEST_RELEASE_NOTE_VERSION)
          if semver.minor(v) < minor
            major = semver.major(LATEST_RELEASE_NOTE_VERSION)
            release.activate("#{major}.#{minor}.0") # current minor release
          else
            release.activate(LATEST_RELEASE_NOTE_VERSION) # current patch
        else
          release.activate()
      catch err
        console.log(err)
      finally
        juliaClientVersion = atom.packages.loadedPackages["julia-client"].metadata.version
        atom.config.set('julia-client.currentVersion', juliaClientVersion)

  requireDeps: (fn) ->
    isLoaded = atom.packages.isPackageLoaded("ink") and atom.packages.isPackageLoaded("language-julia")

    if isLoaded
      fn()
    else
      require('atom-package-deps').install('julia-client')
        .then  => @enableDeps fn
        .catch (err) ->
          console.error err
          atom.notifications.addError 'Installing Juno\'s dependencies failed.',
            description:
              """
              Juno requires the packages #{INK_LINK} and #{LANGUAGE_JULIA_LINK} to run.
              Please install them manually via `File -> Settings -> Packages`,
              or open a terminal and run

                  apm install ink
                  apm install language-julia

              and then restart Atom.
              """
            dismissable: true

  enableDeps: (fn) ->
    isEnabled = atom.packages.isPackageLoaded("ink") and atom.packages.isPackageLoaded("language-julia")

    if isEnabled
      fn()
    else
      atom.packages.enablePackage('ink')
      atom.packages.enablePackage('language-julia')

      if atom.packages.isPackageLoaded("ink") and atom.packages.isPackageLoaded("language-julia")
        atom.notifications.addSuccess "Automatically enabled Juno's dependencies.",
          description:
            """
            Juno requires the #{INK_LINK} and #{LANGUAGE_JULIA_LINK} packages.
            We've automatically enabled them for you.
            """
          dismissable: true

        inkVersion = atom.packages.loadedPackages["ink"].metadata.version
        if not atom.devMode and not semver.satisfies(inkVersion, INK_VERSION_COMPAT)
          atom.notifications.addWarning "Potentially incompatible `ink` version detected.",
            description:
              """
              Please make sure to upgrade #{INK_LINK} to a version compatible with `#{INK_VERSION_COMPAT}`.
              The currently installed version is `#{inkVersion}`.

              If you cannot install an appropriate version via via `File -> Settings -> Packages`,
              open a terminal and run

                  apm install ink@x.y.z

              where `x.y.z` is satisfies `#{INK_VERSION_COMPAT}`.
              """
            dismissable: true

        fn()
      else
        atom.notifications.addError "Failed to enable Juno's dependencies.",
          description:
            """
            Juno requires the #{INK_LINK} and #{LANGUAGE_JULIA_LINK} packages.
            Please install them manually via `File -> Settings -> Packages`,
            or open a terminal and run

                apm install ink
                apm install language-julia

            and then restart Atom.
            """
          dismissable: true

  config: config

  deactivate: ->
    x.deactivate() for x in [commands, menu, toolbar, release, @connection, @runtime, @ui]

  consumeInk: (ink) ->
    commands.ink = ink
    x.consumeInk ink for x in [@connection, @runtime, @ui]

  consumeStatusBar: (bar) -> @runtime.consumeStatusBar bar

  consumeToolBar: (bar) -> toolbar.consumeToolBar bar

  consumeGetServerConfig: (conf) -> @connection.consumeGetServerConfig(conf)

  consumeGetServerName: (name) -> @connection.consumeGetServerName(name)

  consumeDatatip: (datatipService) -> @runtime.consumeDatatip datatipService

  provideClient: -> @connection.client

  provideAutoComplete: -> @runtime.provideAutoComplete()

  provideHyperclick: -> @runtime.provideHyperclick()

  handleURI: (parsedURI) -> @runtime.handleURI parsedURI
