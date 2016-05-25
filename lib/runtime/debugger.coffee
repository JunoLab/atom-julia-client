{client} = require '../connection'

workspace = require './workspace'

{nextline, stepin, finish, stepexpr} =
  client.import ['nextline', 'stepin', 'finish', 'stepexpr']

module.exports =
  activate: ->
    client.handle 'debugmode', (state) => @debugmode state
    client.handle 'stepto', (file, line, text) => @stepto file, line, text

    client.onDisconnected => @debugmode false

  activeError: ->
    if not @active
      atom.notifications.addError "You need to be debugging to do that.",
        detail: """
          You can enter debugging by setting a breakpoint, or
          by calling `@step f(args...)`.
          """
        dismissable: true
      return true

  require: (f) -> @activeError() or f()

  debugmode: (@active) ->
    if !@active
      @stepper.destroy()
      workspace.update()

  stepto: (file, line, text) ->
    @stepper.goto file, line-1
    @stepper.setText text
    workspace.update()

  nextline: -> @require -> nextline()
  stepin: -> @require -> stepin()
  finish: -> @require -> finish()
  stepexpr: -> @require -> stepexpr()

  consumeInk: (ink) ->
    @stepper = new ink.Stepper
      buttons: [
        {icon: 'arrow-down', command: 'julia-debug:step-to-next-line'}
        {icon: 'link-external', command: 'julia-debug:finish-function'}
        {icon: 'chevron-right', command: 'julia-debug:step-into-function'}
      ]
