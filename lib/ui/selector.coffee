{SelectListView} = require 'atom-space-pen-views'

module.exports =
  show: (xs) ->
    @selector ?= new SelectListView
    @selector.setItems []
    @selector.storeFocusedElement()
    @selector.viewForItem = (item) =>
      "<li>#{item}</li>"

    panel = atom.workspace.addModalPanel(item: @selector)
    @selector.focusFilterEditor()

    confirmed = false

    new Promise (resolve, reject) =>

      if xs.constructor == Promise
        @selector.setLoading "Loading..."
        xs.then (xs) => @selector.setItems xs
          .catch (e) =>
            reject e
            @selector.cancel()
      else
        @selector.setItems xs

      @selector.confirmed = (item) =>
        confirmed = true
        @selector.cancel()
        resolve item
      @selector.cancelled = =>
        panel.destroy()
        @selector.restoreFocus()
        resolve() unless confirmed
