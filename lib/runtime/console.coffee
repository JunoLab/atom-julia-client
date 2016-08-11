{CompositeDisposable} = require 'atom'

{history} = require '../misc'
{notifications, views} = require '../ui'
{client} = require '../connection'

modules = require './modules'

evalrepl = client.import 'evalrepl'

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
        view = views.render(view)
        if result.type isnt 'error'
          views.ink.tree.toggle view
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
    atom.packages.activatePackage('language-julia').catch(->).then =>
      @c.setModes @modes
      @c.reset()
    @subs.add @c.onEval (ed) => @eval ed
    @subs.add client.onWorking => @c.loading true
    @subs.add client.onDone => @c.loading false
    atom.views.getView(@c).classList.add 'julia'
    history.read().then (entries) =>
      @c.history.set entries

  ignored: [/^WARNING: Method definition .* overwritten in module/]
  ignore: (s) ->
    for i in @ignored
      return true if s.match(i)

  stdout: (data) -> @c.stdout data

  stderr: (data) ->
    data = data.split('\n').filter((x)=>!@ignore x).join("\n")
    if data then @c.stderr data

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

  input: ->
    new Promise (resolve) =>
      @c.output type: 'input', icon: 'file-text', eval: ->
        resolve @editor.getText()
      @c.emitter.emit 'focus-input'
