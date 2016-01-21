shell =                 require 'shell'
{CompositeDisposable} = require 'atom'

{client, process, tcp, terminal} = require '../connection'
{evaluation, modules} =            require '../runtime'
{console} =                        require '../ui'
{paths} =                          require '../misc'

module.exports =
  activate: ->
    @subs = new CompositeDisposable

    @subs.add atom.commands.add '.item-views > atom-text-editor',
      'julia-client:evaluate': (event) =>
        @withInk ->
          client.start()
          evaluation.eval()
      'julia-client:evaluate-all': (event) =>
        @withInk ->
          client.start()
          evaluation.evalAll()
      'julia-client:toggle-documentation': =>
        @withInk ->
          client.start()
          evaluation.toggleMeta 'docs'
      'julia-client:toggle-methods': =>
        @withInk ->
          client.start()
          evaluation.toggleMeta 'methods'

    @subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': -> terminal.repl()
      'julia-client:start-repl-client': ->
        client.disrequire ->
          tcp.listen (port) -> terminal.client port
      'julia-client:start-julia': ->
        client.disrequire ->
          tcp.listen (port) -> process.start port, console
      'julia-client:toggle-console': => @withInk -> console.toggle()
      'julia-client:reset-loading-indicator': -> client.reset()
      'julia-client:settings': ->
        atom.workspace.open('atom://config/packages/julia-client')

    @subs.add atom.commands.add '.item-views >
                                atom-text-editor[data-grammar="source julia"]',
      'julia-client:set-working-module': -> modules.chooseModule()
      'julia-client:reset-working-module': -> modules.resetModule()


    @subs.add atom.commands.add 'atom-workspace',
      'julia:open-startup-file': -> atom.workspace.open paths.home '.juliarc.jl'
      'julia:open-julia-home': -> shell.openItem paths.juliaHome()
      'julia:open-package-in-new-window': -> paths.openPackage()

    @subs.add atom.commands.add '.item-views > atom-text-editor',
      'julia-client:work-in-file-folder': ->
        client.require -> evaluation.cdHere()
      'julia-client:work-in-project-folder': ->
        client.require -> evaluation.cdProject()
      'julia-client:work-in-home-folder': ->
        client.require -> evaluation.cdHome()

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
