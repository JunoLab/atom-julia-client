shell =                 require 'shell'
cells =                 require '../misc/cells'
{CompositeDisposable} = require 'atom'

module.exports =
  activate: (juno) ->
    requireClient    = (a, f) -> juno.connection.client.require a, f
    disrequireClient = (a, f) -> juno.connection.client.disrequire a, f
    boot = -> juno.connection.boot()

    cancelComplete = (e) ->
      atom.commands.dispatch(e.currentTarget, 'autocomplete-plus:cancel')

    @subs = new CompositeDisposable()

    @subs.add atom.commands.add '.item-views > atom-text-editor',
      'julia-client:run-block': (event) =>
        cancelComplete event
        @withInk ->
          boot()
          juno.runtime.evaluation.eval()
      'julia-client:run-and-move': (event) =>
        @withInk ->
          boot()
          juno.runtime.evaluation.eval(move: true)
      'julia-client:run-file': (event) =>
        cancelComplete event
        @withInk ->
          boot()
          juno.runtime.evaluation.evalAll()
      'julia-client:run-weave-chunks': (event) =>
          cancelComplete event
          @withInk ->
            boot()
            juno.runtime.evaluation.evalAllWeaveChunks()
      'julia-client:run-cell': =>
        @withInk ->
          boot()
          juno.runtime.evaluation.eval(cell: true)
      'julia-client:run-cell-and-move': =>
        @withInk ->
          boot()
          juno.runtime.evaluation.eval(cell: true, move: true)
      'julia-client:next-cell': =>
        cells.moveNext()
      'julia-client:prev-cell': =>
        cells.movePrev()
      'julia-client:goto-symbol': =>
        @withInk ->
          boot()
          juno.runtime.evaluation.gotoSymbol()
      'julia-client:show-documentation': =>
        @withInk ->
          boot()
          juno.runtime.evaluation.toggleDocs()
      'julia-client:reset-workspace': =>
        requireClient 'reset the workspace', ->
          editor = atom.workspace.getActiveTextEditor()
          atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
          juno.connection.client.import('clear-workspace')()
      'julia:select-block': =>
        juno.misc.blocks.select()
      'julia-client:send-to-stdin': (e) =>
        requireClient ->
          ed = e.currentTarget.getModel()
          done = false
          for s in ed.getSelections()
            continue unless s.getText()
            done = true
            juno.connection.client.stdin s.getText()
          juno.connection.client.stdin ed.getText() unless done


    @subs.add atom.commands.add '.item-views > atom-text-editor[data-grammar="source julia"],
                                 .julia-console.julia, ink-terminal, .ink-workspace',
      'julia-client:set-working-module': -> juno.runtime.modules.chooseModule()

    @subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': -> juno.connection.terminal.repl()
      'julia-client:start-julia': -> disrequireClient 'boot Julia', -> boot()
      'julia-client:start-remote-julia-process': -> disrequireClient 'boot a remote Julia process', -> juno.connection.bootRemote()
      'julia-client:kill-julia': -> juno.connection.client.kill()
      'julia-client:interrupt-julia': => requireClient 'interrupt Julia', -> juno.connection.client.interrupt()
      'julia-client:disconnect-julia': => requireClient 'disconnect Julia', -> juno.connection.client.disconnect()
      # 'julia-client:reset-julia-server': -> juno.connection.local.server.reset() # server mode not functional
      'julia-client:connect-external-process': -> disrequireClient -> juno.connection.messages.connectExternal()
      'julia-client:connect-platformio-terminal': -> disrequireClient -> juno.connection.terminal.runPlatformIOTerm()
      'julia-client:connect-terminal': -> disrequireClient -> juno.connection.terminal.connectedRepl()
      'julia-client:open-plot-pane': => @withInk -> juno.runtime.plots.open()
      'julia-client:open-workspace': => @withInk -> juno.runtime.workspace.open()
      'julia-client:settings': -> atom.workspace.open('atom://config/packages/julia-client')
      # breakpoints not supported
      'julia-debug:clear-all-breakpoints': => juno.runtime.debugger.clearbps()
      'julia-debug:get-all-breakpoints': => juno.runtime.debugger.getBPs()
      'julia-debug:toggle-breakpoint': => juno.runtime.debugger.togglebp()
      'julia-debug:step-to-next-line': => juno.runtime.debugger.nextline()
      'julia-debug:step-to-selected-line': => juno.runtime.debugger.toselectedline()
      'julia-debug:step-to-next-expression': => juno.runtime.debugger.stepexpr()
      'julia-debug:step-into-function': => juno.runtime.debugger.stepin()
      'julia-debug:stop-debugging': => juno.runtime.debugger.stop()
      'julia-debug:finish-function': => juno.runtime.debugger.finish()
      'julia-debug:continue': => juno.runtime.debugger.continueForward()
      'julia-debug:open-debugger-pane': => juno.runtime.debugger.openPane()

      'julia:open-julia-startup-file': -> atom.workspace.open(juno.misc.paths.home('.julia', 'config', 'startup.jl'))
      'julia:open-juno-startup-file': -> atom.workspace.open(juno.misc.paths.home('.julia', 'config', 'juno_startup.jl'))
      'julia:open-julia-home': -> shell.openItem juno.misc.paths.juliaHome()
      'julia:open-package-in-new-window': -> juno.runtime.packages.openPackage()
      'julia:standard-layout': -> juno.ui.layout.standard()
      'julia:get-help': -> shell.openExternal 'http://discourse.julialang.org'

      'julia-client:work-in-file-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdHere()
      'julia-client:work-in-project-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdProject()
      'julia-client:work-in-home-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdHome()
      'julia-client:select-working-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdSelect()

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
