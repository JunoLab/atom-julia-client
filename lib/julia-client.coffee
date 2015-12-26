{CompositeDisposable} = require 'atom'
http = require 'http'
terminal = require './connection/terminal'
client = require './connection/client'
proc = require './connection/process'
tcp = require './connection/tcp'
modules = require './modules'
evaluation = require './eval'
notifications = require './ui/notifications'
utils = require './utils'
completions = require './completions'
frontend = require './frontend'
cons = require './ui/console'

defaultTerminal =
  switch process.platform
    when 'darwin'
      'Terminal.app'
    when 'win32'
      'cmd /C start cmd /C'
    else
      'x-terminal-emulator -e'

module.exports = JuliaClient =
  config:
    juliaPath:
      type: 'string'
      default: 'julia'
      description: 'The location of the Julia binary'
    juliaArguments:
      type: 'string'
      default: '-q'
      description: 'Command-line arguments to pass to Julia'
    notifications:
      type: 'boolean'
      default: true
      description: 'Enable notifications for evaluation'
    terminal:
      type: 'string'
      default: defaultTerminal
      description: 'Command used to open a terminal. (Windows/Linux only)'

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @commands @subscriptions
    modules.activate()
    notifications.activate()
    frontend.activate()
    client.onConnected =>
      notifications.show("Client Connected")
    @withInk =>
      cons.activate()

    try
      if id = localStorage.getItem 'metrics.userId'
        http.get "http://data.junolab.org/hit?id=#{id}&app=atom-julia"

  deactivate: ->
    @subscriptions.dispose()
    modules.deactivate()
    cons.deactivate()
    @spinner.dispose()

  commands: (subs) ->
    subs.add atom.commands.add '.item-views > atom-text-editor',
      'julia-client:evaluate': (event) =>
        @withInk =>
          client.start()
          evaluation.eval()
      'julia-client:evaluate-all': (event) =>
        @withInk =>
          client.start()
          evaluation.evalAll()
      'julia-client:toggle-documentation': =>
        @withInk =>
          client.start()
          evaluation.toggleMeta 'docs'
      'julia-client:toggle-methods': =>
        @withInk =>
          client.start()
          evaluation.toggleMeta 'methods'

    subs.add atom.commands.add 'atom-workspace',
      'julia-client:open-a-repl': => terminal.repl()
      'julia-client:start-repl-client': =>
        client.disrequire =>
          tcp.listen (port) => terminal.client port
      'julia-client:start-julia': =>
        client.disrequire =>
          tcp.listen (port) => proc.start port, cons
      'julia-client:toggle-console': => @withInk => cons.toggle()
      'julia-client:reset-loading-indicator': => client.reset()

    subs.add atom.commands.add '.item-views > atom-text-editor[data-grammar="source julia"]',
      'julia-client:set-working-module': => modules.chooseModule()
      'julia-client:reset-working-module': => modules.resetModule()

    utils.commands subs

  consumeInk: (ink) ->
    @ink = ink
    evaluation.ink = ink
    cons.ink = ink
    @loading = new ink.Loading
    client.loading = @loading
    cons.loading = @loading
    @spinner = new ink.Spinner client.loading
    client.handle 'show-block', ({start, end}) =>
      if ed = atom.workspace.getActiveTextEditor()
        ink.highlight ed, start-1, end-1

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

  consumeStatusBar: (bar) -> modules.consumeStatusBar(bar)

  completions: -> completions
