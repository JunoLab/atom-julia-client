{SelectListView} = require 'atom-space-pen-views'

module.exports =
  show: (xs) ->
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

    new Promise (resolve) =>
      @selector.confirmed = (item) =>
        confirmed = true
        @selector.cancel()
        resolve item
      @selector.cancelled = =>
        panel.destroy()
        resolve() unless confirmed
