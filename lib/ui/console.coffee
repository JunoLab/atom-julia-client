# TODO: modules, history, modes

comm = require '../connection/comm'

module.exports =
  activate: ->
    @create()

    @cmd = atom.commands.add 'atom-workspace',
      "julia-client:clear-console": =>
        @c.reset()

    comm.handle 'info', ({msg}) =>
      @c.info msg

  deactivate: ->
    @cmd.dispose()

  create: ->
    @c = new @ink.Console
    @c.setGrammar atom.grammars.grammarForScopeName('source.julia')
    @c.view.getTitle = -> "Julia"
    @c.onEval (ed) => @eval ed
    @c.input()
    @loading.onWorking => @c.view.loading true
    @loading.onDone => @c.view.loading false

  toggle: -> @c.toggle()

  eval: (ed) ->
    if ed.getText()
      comm.withClient =>
        @c.done()
        comm.msg 'eval-repl', {code: ed.getText()}, (result) =>
          @c.input()
