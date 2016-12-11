{CompositeDisposable} = require 'atom'

{history, bufferLines} = require '../misc'
{notifications, views} = require '../ui'
{client} = require '../connection'

modules = require './modules'
debug = require './debugger'

{evalrepl, clearLazy} = client.import rpc: ['evalrepl'], msg: ['clearLazy']

module.exports =
  activate: ->
    @subs = new CompositeDisposable

    @create()

    @subs.add atom.config.observe 'julia-client.maximumConsoleSize', (size) =>
      @c.maxSize = size

    client.handle
      info: (msg) =>
        @c.info msg

      result: (result) =>
        view = if result.type == 'error' then result.view else result
        registerLazy = (id) => @c.onceDidClear client.withCurrent -> clearLazy [id]
        view = views.render view, {registerLazy}
        if result.type isnt 'error'
          views.ink.tree.toggle view
          view.onToggle?()
        @c.result view,
          error: result.type == 'error'

      input: => @input()

    @subs.add client.onStdout (s) => @stdout s
    @subs.add client.onStderr (s) => @stderr s
    @subs.add client.onInfo   (s) => @info s

  deactivate: ->
    @c.close()
    @subs.dispose()
    history.write @c.history.items

  create: ->
    @c = @ink.Console.fromId 'julia'
    # TODO: have a way to update the current input
    @c.setModes @modes
    @subs.add @c.onEval (ed) => @eval ed
    @subs.add client.onWorking => @c.loading true
    @subs.add client.onDone => @c.loading false
    atom.views.getView(@c).classList.add 'julia', 'julia-console'
    history.read().then (entries) =>
      @c.history.set entries
    @c.toolbar = @toolbar

  ignored: [/^WARNING: Method definition .* overwritten/]
  ignore: (s) ->
    for i in @ignored
      return true if s.match(i)

  stdout: (data) -> @c.stdout data

  stderr: (data, isLine) ->
    if not @ignore(data)
      @c.stderr data
      if isLine then @c.stderr '\n'

  info: (data) -> @c.info data

  open: ->
    @c.open
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
        require('./workspace').update()
      .catch => @c.input()

  modes: [
    {name: 'julia', grammar: 'source.julia'}
    {name: 'help', prefix: '?', icon: 'question', grammar: 'source.julia'}
    {name: 'shell', prefix: ';', icon: 'terminal', grammar: 'source.shell'}
  ]

  toolbar: [{
      type: 'group'
      children: [
        {icon: 'link-external', alt: 'Debug: Finish Function', onclick: ()->debug.finish()}
        {icon: 'arrow-down', alt: 'Debug: Next Line', onclick: ()->debug.nextline()}
        {icon: 'triangle-right', alt: 'Debug: Next Expression', onclick: ()->debug.stepexpr()}
        {icon: 'sign-in', alt: 'Debug: Step into Function', onclick: () -> debug.stepin()}
      ]
  }]

  input: ->
    new Promise (resolve) =>
      @c.output type: 'input', icon: 'file-text', eval: ->
        resolve @editor.getText()
      @c.emitter.emit 'focus-input'
