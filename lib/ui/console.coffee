# TODO: modules, history

comm = require '../connection/comm'
notifications = require '../ui/notifications'

module.exports =
  activate: ->
    @create()

    @cmd = atom.commands.add 'atom-workspace',
      "julia-client:clear-console": =>
        @c.reset()

    comm.handle 'info', ({msg}) =>
      @c.info msg

    comm.handle 'result', ({result, error}) =>
      view = @ink.tree.fromJson(result)
      @ink.tree.toggle view unless error
      @c.result view,
        error: error

  deactivate: ->
    @cmd.dispose()

  create: ->
    @c = new @ink.Console
    @c.setGrammar atom.grammars.grammarForScopeName('source.julia')
    @c.view.getTitle = -> "Julia"
    @c.modes = => @replModes
    @c.onEval (ed) => @eval ed
    @c.input()
    @loading.onWorking => @c.view.loading true
    @loading.onDone => @c.view.loading false

  toggle: -> @c.toggle()

  eval: (ed) ->
    if ed.getText()
      comm.withClient =>
        @c.done()
        comm.msg 'eval-repl', {code: ed.getText(), mode: ed.inkConsoleMode?.name}, (result) =>
          @c.input()
          notifications.show "Evaluation Finished"

  replModes:
    ';':
      name: 'shell'
      icon: 'terminal'
      grammar: atom.grammars.grammarForScopeName('source.shell')
    '?':
      name: 'help'
      icon: 'question'
