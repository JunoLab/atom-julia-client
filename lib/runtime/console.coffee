{CompositeDisposable} = require 'atom'

{history} = require '../misc'
{notifications, views} = require '../ui'
{client, process} = require '../connection'

modules = require './modules'

{evalrepl} = client.import 'evalrepl'

module.exports =
  activate: ->
    @create()

    @subs = new CompositeDisposable

    @subs.add atom.workspace.addOpener (uri) =>
      if uri is 'atom://julia-client/console'
        @c

    client.handle 'info', (msg) =>
      @c.info msg

    client.handle 'result', (result) =>
      view = if result.type == 'error' then result.view else result
      view = views.render(view)
      if result.type isnt 'error'
        views.ink.tree.toggle view
      @c.result view,
        error: result.type == 'error'

    client.handle 'input', => @input()

    process.onStdout (s) => @c.stdout s
    process.onStderr (s) => @c.stderr s

  deactivate: ->
    @subs.dispose()
    history.write @c.history.items

  create: ->
    @c = @ink.Console.fromId 'julia'
    @c.setModes @modes
    @c.onEval (ed) => @eval ed
    client.onWorking => @c.loading true
    client.onDone => @c.loading false
    atom.views.getView(@c).classList.add 'julia'
    history.read().then (entries) =>
      @c.history.set entries

  open: ->
    # Seems like atom should be doing this check for us,
    # but it looks like it's broken.
    @c.activate() or
      atom.workspace.open "atom://julia-client/console",
        split: 'down'
        searchAllPanes: true

  reset: -> @c.reset()

  eval: ({editor, mode}) ->
    return unless editor.getText().trim()
    client.boot()
    @c.logInput()
    @c.done()
    evalrepl(code: editor.getText(), mode: mode?.name, mod: modules.current())
      .then (result) =>
        @c.input()
        notifications.show "Evaluation Finished"
      .catch => @c.input()

  modes: [
    {name: 'julia', default: true, grammar: 'source.julia'}
    {name: 'help', prefix: '?', icon: 'question', grammar: 'source.julia'}
    {name: 'shell', prefix: ';', icon: 'terminal', grammar: 'source.shell'}
  ]

  input: ->
    new Promise (resolve) =>
      @c.output type: 'input', icon: 'file-text', eval: ->
        resolve @editor.getText()
      @c.emitter.emit 'focus-input'
