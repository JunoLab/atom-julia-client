comm = require './connection/comm'

module.exports =
  activate: ->
    @createUI()

    # TODO: subscribe to client creation/destruction
    @activeItemSubscription = atom.workspace.onDidChangeActivePaneItem =>
      @update()
    @update()

  deactivate: ->
    @tile?.destroy()
    @tile = null
    @activeItemSubscription.dispose()

  createUI: ->
    @dom = document.createElement 'span'
    @dom.classList.add 'julia-client'
    @main = document.createElement 'a'
    @sub = document.createElement 'span'
    @divider = document.createElement 'span'
    @divider.innerText = '/'

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
    pane = atom.workspace.getActivePaneItem()
    unless pane.getGrammar?().scopeName == 'source.julia' && comm.isConnected()
      @clear()
      return
    comm.msg 'module', {}, ({main, sub}) =>
      @reset main, sub
