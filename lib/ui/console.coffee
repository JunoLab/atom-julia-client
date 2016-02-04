# TODO: modules
{CompositeDisposable} = require 'atom'

{history} =     require '../misc'
notifications = require './notifications'
views =         require './views'

module.exports =
  activate: (@client) ->
    @create()

    @subs = new CompositeDisposable

    @subs.add atom.workspace.addOpener (uri) =>
      if uri is 'atom://julia-client/console'
        @c

    @client.handle 'info', (msg) =>
      @c.info msg

    @client.handle 'result', (result) =>
      view = if result.type == 'error' then result.view else result
      view = views.render(view)
      if result.type isnt 'error'
        views.ink.tree.toggle view
      @c.result view,
        error: result.type == 'error'

  deactivate: ->
    @subs.dispose()
    history.write @c.history.items

  create: ->
    @c = new @ink.Console
    @c.setModes @modes
    @c.onEval (ed) => @eval ed
    # @client.onWorking => @c.view.loading true
    # @client.onDone => @c.view.loading false
    atom.views.getView(@c).classList.add 'julia'
    history.read().then (entries) =>
      @c.history.set entries

  toggle: -> @c.toggle()

  eval: ({editor, mode}) ->
    if editor.getText().trim()
      @client.boot()
      @c.logInput()
      @c.done()
      @client.rpc('evalrepl', code: editor.getText(), mode: mode?.name)
        .then (result) =>
          @c.input()
          notifications.show "Evaluation Finished"
        .catch => @c.input()

  modes: [
    {name: 'julia', default: true, grammar: 'source.julia'}
    {name: 'help', prefix: '?', icon: 'question', grammar: 'source.julia'}
    {name: 'shell', prefix: ';', icon: 'terminal', grammar: 'source.shell'}
  ]
