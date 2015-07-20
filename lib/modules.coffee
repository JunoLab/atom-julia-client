comm = require './connection/comm'
{SelectListView} = require 'atom-space-pen-views'

module.exports =
  activate: ->
    @createStatusUI()
    @createSelector()

    @activeItemSubscription = atom.workspace.onDidChangeActivePaneItem =>
      @update()
    comm.onConnected => @update()
    comm.onDisconnected => @update()
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
    unless ed.getGrammar?().scopeName == 'source.julia' && comm.isConnected()
      @clear()
      return
    @moveSubscription = ed.onDidChangeCursorPosition => @update()
    {row, column} = ed.getCursors()[0].getScreenPosition()
    data =
      path: ed.getPath()
      code: ed.getText()
      row: row+1, column: column+1
      held: ed.juliaModule

    comm.msg 'module', data, ({main, sub}) =>
      @reset main, sub

  # Selector

  createSelector: ->
    @selector = new SelectListView
    @selector.viewForItem = (item) =>
      "<li>#{item}</li>"
    @selector.confirmed = (item) =>
      @panel.hide()
      atom.workspace.getActiveTextEditor().juliaModule = item
      @update()
    @selector.cancelled = =>
      @panel.hide()

  chooseModule: ->
    if comm.notConnectedError() then return
    comm.msg 'all-modules', {}, (mods) =>
      @selector.setItems mods
      @panel ?= atom.workspace.addModalPanel(item: @selector)
      @panel.show()
      @selector.focusFilterEditor()

  resetModule: ->
    if comm.notConnectedError() then return
    delete atom.workspace.getActiveTextEditor().juliaModule
    @update()
