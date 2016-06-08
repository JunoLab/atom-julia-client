{views} = require '../ui'
{client} = require '../connection'

workspace = require './workspace'

{nextline, stepin, finish, stepexpr} =
  client.import ['nextline', 'stepin', 'finish', 'stepexpr']

breakpoints = null

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
    @stepper.setText views.render text
    workspace.update()

  nextline: -> @require -> nextline()
  stepin: -> @require -> stepin()
  finish: -> @require -> finish()
  stepexpr: -> @require -> stepexpr()

  breakpoints: []

  bp: (file, line) ->
    if (existing = breakpoints.get(file, line, @breakpoints)[0])?
      @breakpoints = @breakpoints.filter (x) -> x != existing
      return existing.destroy()
    @breakpoints.push breakpoints.add file, line

  togglebp: (ed = atom.workspace.getActiveTextEditor()) ->
    return unless ed
    for cursor in ed.getCursors()
      @bp ed.getPath(), cursor.getBufferPosition().row

  consumeInk: (ink) ->
    @stepper = new ink.Stepper
      buttons: [
        {icon: 'arrow-down', command: 'julia-debug:step-to-next-line', tooltip: 'Step to the next line.'}
        {icon: 'link-external', command: 'julia-debug:finish-function', tooltip: 'Finish function.'}
        {icon: 'chevron-right', command: 'julia-debug:step-into-function', tooltip: 'Step into function.'}
      ]
    breakpoints = ink.breakpoints
    breakpoints.addScope 'source.julia'
