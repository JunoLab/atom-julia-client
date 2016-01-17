# TODO: modules, history

client = require '../connection/client'
notifications = require '../ui/notifications'
views = require './views'

module.exports =
  activate: ->
    @create()

    @cmd = atom.commands.add 'atom-workspace',
      "julia-client:clear-console": =>
        @c.reset()

    client.handle 'info', ({msg}) =>
      @c.info msg

    client.handle 'result', ({result}) =>
      view = views.render result
      @c.result view, {}

  deactivate: ->
    @cmd.dispose()

  create: ->
    @c = new @ink.Console
    @c.setGrammar atom.grammars.grammarForScopeName('source.julia')
    @c.view[0].classList.add 'julia'
    @c.view.getTitle = -> "Julia"
    @c.modes = => @replModes
    @c.onEval (ed) => @eval ed
    @c.input()
    @loading.onWorking => @c.view.loading true
    @loading.onDone => @c.view.loading false

  toggle: -> @c.toggle()

  eval: (ed) ->
    if ed.getText()
      client.start()
      @c.done()
      client.msg 'eval-repl', {code: ed.getText(), mode: ed.inkConsoleMode?.name}, (result) =>
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
