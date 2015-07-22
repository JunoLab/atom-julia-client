{SelectListView} = require 'atom-space-pen-views'

module.exports =
  show: (xs, f) ->
    @selector ?= new SelectListView
    @selector.viewForItem = (item) =>
      "<li>#{item}</li>"

    if xs.constructor == Promise
      @selector.setLoading "Loading..."
      xs.then (xs) =>
        @selector.setItems xs
    else
      @selector.setItems xs

    @panel ?= atom.workspace.addModalPanel(item: @selector)

    @panel.show()
    @selector.storeFocusedElement()
    @selector.focusFilterEditor()

    @selector.confirmed = (item) =>
      @panel.hide()
      f(item)
    @selector.cancelled = =>
      @panel.hide()
