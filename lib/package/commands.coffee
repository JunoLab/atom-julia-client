shell =                 require 'shell'
{CompositeDisposable} = require 'atom'

module.exports =
  activate: (juno) ->
    requireClient    = (f) -> juno.connection.client.require f
    disrequireClient = (f) -> juno.connection.client.disrequire f
    boot = -> juno.connection.boot()

    @subs = new CompositeDisposable

    @subs.add atom.commands.add '.item-views > atom-text-editor',
      'julia-client:evaluate': (event) =>
        @withInk ->
          boot()
          juno.runtime.evaluation.eval()
      'julia-client:evaluate-all': (event) =>
        @withInk ->
          boot()
          juno.runtime.evaluation.evalAll()
      'julia-client:toggle-documentation': =>
        @withInk ->
          boot()
          juno.runtime.evaluation.toggleMeta 'docs'
      'julia-client:toggle-methods': =>
        @withInk ->
          boot()
          juno.runtime.evaluation.toggleMeta 'methods'

    @subs.add atom.commands.add '.item-views > atom-text-editor[data-grammar="source julia"],
                                 ink-console.julia',
      'julia-client:set-working-module': -> juno.runtime.modules.chooseModule()

    @subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': -> juno.connection.terminal.repl()
      'julia-client:start-julia': ->
        disrequireClient -> boot()
      'julia-client:open-console': => @withInk -> juno.runtime.console.open()
      "julia-client:clear-console": => juno.runtime.console.reset()
      'julia-client:reset-loading-indicator': -> juno.connection.client.reset()
      'julia-client:settings': ->
        atom.workspace.open('atom://config/packages/julia-client')

      'julia:open-startup-file': -> atom.workspace.open juno.misc.paths.home '.juliarc.jl'
      'julia:open-julia-home': -> shell.openItem juno.misc.paths.juliaHome()
      'julia:open-package-in-new-window': -> juno.misc.paths.openPackage()

      'julia-client:work-in-file-folder': ->
        requireClient -> juno.runtime.evaluation.cdHere()
      'julia-client:work-in-project-folder': ->
        requireClient -> juno.runtime.evaluation.cdProject()
      'julia-client:work-in-home-folder': ->
        requireClient -> juno.runtime.evaluation.cdHome()

  deactivate: ->
    @subs.dispose()

  withInk: (f, err) ->
    if @ink?
      f()
    else if err
      atom.notifications.addError 'Please install the Ink package.',
        detail: 'Julia Client requires the Ink package to run.
                 You can install it from the settings view.'
        dismissable: true
    else
      setTimeout (=> @withInk f, true), 100
