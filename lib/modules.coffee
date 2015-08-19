client = require './connection/client'
selector = require './ui/selector'

module.exports =
  activate: ->
    @createStatusUI()

    @activeItemSubscription = atom.workspace.onDidChangeActivePaneItem =>
      @update()
    client.onConnected => @update()
    client.onDisconnected => @update()
    @update()

  deactivate: ->
    @tile?.destroy()
    @tile = null
    @activeItemSubscription.dispose()

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

  update: ->
    @moveSubscription?.dispose()
    ed = atom.workspace.getActivePaneItem()
    unless ed?.getGrammar?().scopeName == 'source.julia' && client.isConnected()
      @clear()
      @moveSubscription = ed?.onDidChangeGrammar? => @update()
      return
    @moveSubscription = ed.onDidChangeCursorPosition => @update()
    {row, column} = ed.getCursors()[0].getScreenPosition()
    data =
      path: ed.getPath()
      code: ed.getText()
      row: row+1, column: column+1
      module: ed.juliaModule

    client.msg 'module', data, ({main, sub, inactive, subInactive}) =>
      @reset main, sub
      subInactive && @subInactive()
      inactive && @inactive()

  # TODO: auto detect option, remove reset command
  chooseModule: ->
    client.require =>
      mods = new Promise (resolve) =>
        client.msg 'all-modules', {}, (mods) =>
          resolve mods
      selector.show mods, (mod) =>
        return unless mod?
        atom.workspace.getActiveTextEditor().juliaModule = mod
        @update()

  resetModule: ->
    client.require =>
      delete atom.workspace.getActiveTextEditor().juliaModule
      @update()
