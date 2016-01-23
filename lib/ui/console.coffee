# TODO: modules

{client} =      require '../connection'
{history} =     require '../misc'
notifications = require './notifications'
views =         require './views'

module.exports =
  activate: ->
    @create()

    @cmd = atom.commands.add 'atom-workspace',
      "julia-client:clear-console": =>
        @c.reset()

    client.handle 'info', (msg) =>
      @c.info msg

    client.handle 'result', (result) =>
      view = if result.type == 'error' then result.view else result
      @c.result views.render(view),
        error: result.type == 'error'

  deactivate: ->
    @cmd.dispose()
    history.write @c.history
    @c.destroy()

  create: ->
    @c = new @ink.Console
    # Ugly, but the grammar doesn't seem to be loaded immediately.
    setTimeout (=>
      @c.setGrammar atom.grammars.grammarForScopeName('source.julia')
      @c.input()
    ), 10
    @c.view[0].classList.add 'julia'
    @c.view.getTitle = -> "Julia"
    @c.modes = => @replModes
    @c.onEval (ed) => @eval ed
    client.loading.onWorking => @c.view.loading true
    client.loading.onDone => @c.view.loading false
    history.read().then (entries) =>
      @c.setHistory entries

  toggle: -> @c.toggle()

  eval: (ed) ->
    if ed.getText().trim()
      client.start()
      @c.done()
      client.rpc('evalrepl', code: ed.getText(), mode: ed.inkConsoleMode?.name).then (result) =>
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
