shell                 = require 'shell'
cells                 = require '../misc/cells'
{CompositeDisposable} = require 'atom'

module.exports =
  activate: (juno) ->
    requireClient    = (a, f) -> juno.connection.client.require a, f
    disrequireClient = (a, f) -> juno.connection.client.disrequire a, f
    boot = -> juno.connection.boot()

    cancelComplete = (e) ->
      atom.commands.dispatch(e.currentTarget, 'autocomplete-plus:cancel')

    @subs = new CompositeDisposable()

    # atom-text-editors with Julia scopes
    for scope in atom.config.get('julia-client.juliaSyntaxScopes')
      @subs.add atom.commands.add "atom-text-editor[data-grammar='#{scope.replace /\./g, ' '}']",
        'julia-client:run-block': (event) =>
          cancelComplete event
          @withInk ->
            boot()
            juno.runtime.evaluation.eval()
        'julia-client:run-and-move': (event) =>
          @withInk ->
            boot()
            juno.runtime.evaluation.eval(move: true)
        'julia-client:run-all': (event) =>
          cancelComplete event
          @withInk ->
            boot()
            juno.runtime.evaluation.evalAll()
        'julia-client:run-cell': =>
          @withInk ->
            boot()
            juno.runtime.evaluation.eval(cell: true)
        'julia-client:run-cell-and-move': =>
          @withInk ->
            boot()
            juno.runtime.evaluation.eval(cell: true, move: true)
        'julia-client:select-block': =>
          juno.misc.blocks.select()
        'julia-client:next-cell': =>
          cells.moveNext()
        'julia-client:prev-cell': =>
          cells.movePrev()
        'julia-client:goto-symbol': =>
          @withInk ->
            boot()
            juno.runtime.goto.gotoSymbol()
        'julia-client:show-documentation': =>
          @withInk ->
            boot()
            juno.runtime.evaluation.toggleDocs()
        # @NOTE: `'clear-workspace'` is now not handled by Atom.jl
        # 'julia-client:reset-workspace': =>
        #   requireClient 'reset the workspace', ->
        #     editor = atom.workspace.getActiveTextEditor()
        #     atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
        #     juno.connection.client.import('clear-workspace')()
        'julia-client:send-to-stdin': (e) =>
          requireClient ->
            ed = e.currentTarget.getModel()
            done = false
            for s in ed.getSelections()
              continue unless s.getText()
              done = true
              juno.connection.client.stdin s.getText()
            juno.connection.client.stdin ed.getText() unless done
        'julia-debug:run-block': =>
          @withInk ->
            boot()
            juno.runtime.debugger.debugBlock(false, false)
        'julia-debug:step-through-block': =>
          @withInk ->
            boot()
            juno.runtime.debugger.debugBlock(true, false)
        'julia-debug:run-cell': =>
          @withInk ->
            boot()
            juno.runtime.debugger.debugBlock(false, true)
        'julia-debug:step-through-cell': =>
          @withInk ->
            boot()
            juno.runtime.debugger.debugBlock(true, true)
        'julia-debug:toggle-breakpoint': =>
          @withInk ->
            boot()
            juno.runtime.debugger.togglebp()
        'julia-debug:toggle-conditional-breakpoint': =>
          @withInk ->
            boot()
            juno.runtime.debugger.togglebp(true)

    # atom-text-editor with Julia grammar scope
    @subs.add atom.commands.add 'atom-text-editor[data-grammar="source julia"]',
      'julia-client:format-code': =>
        @withInk ->
          boot()
          juno.runtime.formatter.formatCode()

    # Where "module" matters
    @subs.add atom.commands.add 'atom-text-editor[data-grammar="source julia"],
                                 .julia-terminal,
                                 .ink-workspace',
      'julia-client:set-working-module': -> juno.runtime.modules.chooseModule()

    # tree-view
    @subs.add atom.commands.add '.tree-view',
      'julia-client:run-all': (ev) =>
        cancelComplete ev
        @withInk ->
          boot()
          juno.runtime.evaluation.evalAll(ev.target)
      'julia-debug:run-file': (ev) =>
        @withInk ->
          boot()
          juno.runtime.debugger.debugFile(false, ev.target)
      'julia-debug:step-through-file': (ev) =>
        @withInk ->
          boot()
          juno.runtime.debugger.debugFile(true, ev.target)

    # atom-work-space
    @subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-external-REPL': -> juno.connection.terminal.repl()
      'julia-client:start-julia': -> disrequireClient 'boot Julia', -> boot()
      'julia-client:start-remote-julia-process': -> disrequireClient 'boot a remote Julia process', -> juno.connection.bootRemote()
      'julia-client:kill-julia': -> juno.connection.client.kill()
      'julia-client:interrupt-julia': => requireClient 'interrupt Julia', -> juno.connection.client.interrupt()
      'julia-client:disconnect-julia': => requireClient 'disconnect Julia', -> juno.connection.client.disconnect()
      # 'julia-client:reset-julia-server': -> juno.connection.local.server.reset() # server mode not functional
      'julia-client:connect-external-process': -> disrequireClient -> juno.connection.messages.connectExternal()
      'julia-client:connect-terminal': -> disrequireClient -> juno.connection.terminal.connectedRepl()
      'julia-client:open-plot-pane': => @withInk -> juno.runtime.plots.open()
      'julia-client:open-outline-pane': => @withInk -> juno.runtime.outline.open()
      'julia-client:open-workspace': => @withInk -> juno.runtime.workspace.open()
      'julia-client:restore-default-layout': -> juno.ui.layout.restoreDefaultLayout()
      'julia-client:close-juno-panes': -> juno.ui.layout.closePromises()
      'julia-client:reset-default-layout-settings': -> juno.ui.layout.resetDefaultLayoutSettings()
      'julia-client:settings': -> atom.workspace.open('atom://config/packages/julia-client')

      'julia-debug:run-file': =>
        @withInk ->
          boot()
          juno.runtime.debugger.debugFile(false)
      'julia-debug:step-through-file': =>
        @withInk ->
          boot()
          juno.runtime.debugger.debugFile(true)
      'julia-debug:clear-all-breakpoints': => juno.runtime.debugger.clearbps()
      'julia-debug:step-to-next-line': (ev) => juno.runtime.debugger.nextline(ev)
      'julia-debug:step-to-selected-line': (ev) => juno.runtime.debugger.toselectedline(ev)
      'julia-debug:step-to-next-expression': (ev) => juno.runtime.debugger.stepexpr(ev)
      'julia-debug:step-into': (ev) => juno.runtime.debugger.stepin(ev)
      'julia-debug:stop-debugging': (ev) => juno.runtime.debugger.stop(ev)
      'julia-debug:step-out': (ev) => juno.runtime.debugger.finish(ev)
      'julia-debug:continue': (ev) => juno.runtime.debugger.continueForward(ev)
      'julia-debug:open-debugger-pane': => juno.runtime.debugger.open()

      'julia:new-julia-file': =>
        atom.workspace.open().then((ed) =>
          gr = atom.grammars.grammarForScopeName('source.julia')
          ed.setGrammar(gr) if gr
        )
      'julia:open-julia-startup-file': -> atom.workspace.open(juno.misc.paths.home('.julia', 'config', 'startup.jl'))
      'julia:open-juno-startup-file': -> atom.workspace.open(juno.misc.paths.home('.julia', 'config', 'juno_startup.jl'))
      'julia:open-julia-home': -> shell.openItem juno.misc.paths.juliaHome()
      'julia:open-package-in-new-window': -> requireClient 'get packages', -> juno.runtime.packages.openPackage()
      'julia:open-package-as-project-folder': -> requireClient 'get packages', -> juno.runtime.packages.openPackage(false)
      'julia:get-help': -> shell.openExternal 'http://discourse.julialang.org'
      'julia-client:debug-info': =>
        boot()
        juno.runtime.debuginfo()

      'julia-client:work-in-current-folder': (ev) ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdHere(ev.target)
      'julia-client:work-in-project-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdProject()
      'julia-client:work-in-home-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdHome()
      'julia-client:select-working-folder': ->
        requireClient 'change working folder', ->
          juno.runtime.evaluation.cdSelect()
      'julia-client:activate-environment-in-current-folder': (ev) ->
        requireClient 'activate an environment', ->
          juno.runtime.evaluation.activateProject(ev.target)
      'julia-client:activate-environment-in-parent-folder': (ev) ->
        requireClient 'activate an environment', ->
          juno.runtime.evaluation.activateParentProject(ev.target)
      'julia-client:activate-default-environment': (ev) ->
        requireClient 'activate an environment', ->
          juno.runtime.evaluation.activateDefaultProject()
      'julia-client:set-working-environment': (ev) ->
        juno.runtime.environments.chooseEnvironment()

  deactivate: ->
    @subs.dispose()

  withInk: (f, err) ->
    if @ink?
      f()
    else if err
      atom.notifications.addError 'Please install the Ink package.',
        detail: 'Julia Client requires the Ink package to run.
                 You can install it via `File -> Settings -> Install`.'
        dismissable: true
    else
      setTimeout (=> @withInk f, true), 100
