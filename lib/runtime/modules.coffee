{CompositeDisposable} = require 'atom'

{client} = require '../connection'
{selector} = require '../ui'

module.exports =
  activate: ->
    @subscriptions = new CompositeDisposable
    @createStatusUI()

    # configure all the events that persist until we're deactivated
    @subscriptions.add atom.workspace.onDidChangeActivePaneItem => @activePaneChanged()
    @subscriptions.add client.onConnected => @editorStateChanged()
    @subscriptions.add client.onDisconnected => @editorStateChanged()
    @activePaneChanged()

  deactivate: ->
    @tile?.destroy()
    @tile = null
    @subscriptions.dispose()
    @grammarChangeSubscription?.dispose()
    @moveSubscription?.dispose()
    if @pendingUpdate then clearTimeout @pendingUpdate


  activePaneChanged: ->
    @grammarChangeSubscription?.dispose()
    ed = atom.workspace.getActivePaneItem()
    @grammarChangeSubscription = ed?.onDidChangeGrammar? => @editorStateChanged()
    @editorStateChanged()

  # sets or clears the callback on cursor change based on the editor state
  editorStateChanged: ->
    # first clear the display and remove any old subscription
    @clear()
    @moveSubscription?.dispose()

    # now see if we need to resubscribe
    ed = atom.workspace.getActivePaneItem()
    if ed?.getGrammar?().scopeName == 'source.julia' && client.isConnected()
      @moveSubscription = ed.onDidChangeCursorPosition =>
        if @pendingUpdate then clearTimeout @pendingUpdate
        @pendingUpdate = setTimeout (=> @update()), 300
      @update()

  # Status Bar

  createStatusUI: ->
    @dom = document.createElement 'span'
    @dom.classList.add 'julia-client'
    @main = document.createElement 'a'
    @sub = document.createElement 'span'
    @divider = document.createElement 'span'
    @divider.innerText = '/'

    @main.onclick = =>
      atom.commands.dispatch atom.views.getView(atom.workspace.getActiveTextEditor()),
                             'julia-client:set-working-module'

    atom.tooltips.add @dom,
      title: => "Currently working with module #{@currentModule()}"

  currentModule: ->
    if @isInactive then "Main"
    else if @isSubInactive || @sub.innerText == "" then @main.innerText
    else "#{@main.innerText}.#{@sub.innerText}"

  consumeStatusBar: (bar) ->
    @tile = bar.addRightTile {item: @dom}

  clear: -> @dom.innerHTML = ""

  reset: (main, sub) ->
    @clear()
    @main.innerText = main
    @sub.innerText = sub
    @dom.appendChild @main
    if sub
      @dom.appendChild @divider
      @dom.appendChild @sub
    @active()

  isSubInactive: false
  isInactive: false

  active: ->
    @isInactive = false
    @isSubInactive = false
    @main.classList.remove 'fade'
    @divider.classList.remove 'fade'
    @sub.classList.remove 'fade'
  subInactive: ->
    @active()
    @isSubInactive = true
    @sub.classList.add 'fade'
  inactive: ->
    @active()
    @isInactive = true
    @main.classList.add 'fade'
    @divider.classList.add 'fade'
    @sub.classList.add 'fade'

  # gets the current module from the Julia process and updates the display.
  # assumes that we're connected and in a julia file
  update: ->
    ed = atom.workspace.getActivePaneItem()
    {row, column} = ed.getCursors()[0].getScreenPosition()
    data =
      path: ed.getPath()
      code: ed.getText()
      row: row+1, column: column+1
      module: ed.juliaModule

    client.rpc('module', data).then ({main, sub, inactive, subInactive}) =>
      @reset main, sub
      subInactive && @subInactive()
      inactive && @inactive()

  # TODO: auto detect option, remove reset command
  chooseModule: ->
    client.require =>
      selector.show(client.rpc('allmodules')).then (mod) =>
        return unless mod?
        atom.workspace.getActiveTextEditor().juliaModule = mod
        @update()

  resetModule: ->
    client.require =>
      delete atom.workspace.getActiveTextEditor().juliaModule
      @update()
