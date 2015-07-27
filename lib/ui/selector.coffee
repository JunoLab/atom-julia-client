{SelectListView} = require 'atom-space-pen-views'

module.exports =
  show: (xs, f) ->
    @selector ?= new SelectListView
    @selector.setItems []
    @selector.storeFocusedElement()
    @selector.viewForItem = (item) =>
      "<li>#{item}</li>"

    if xs.constructor == Promise
      @selector.setLoading "Loading..."
      xs.then (xs) =>
        @selector.setItems xs
    else
      @selector.setItems xs

    panel = atom.workspace.addModalPanel(item: @selector)
    @selector.focusFilterEditor()

    confirmed = false
    @selector.confirmed = (item) =>
      f(item)
      confirmed = true
      @selector.cancel()
    @selector.cancelled = =>
      panel.destroy()
      f() unless confirmed
