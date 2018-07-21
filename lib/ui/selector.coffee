{SelectListView} = require 'atom-space-pen-views'

module.exports =
  show: (xs, {active} = {}) ->
    @selector ?= new SelectListView
    @selector.list.addClass 'mark-active'
    @selector.addClass('command-palette')
    @selector.addClass('julia-client-selector')

    @selector.setItems []
    @selector.storeFocusedElement()
    @selector.viewForItem = (item) =>
      view = document.createElement 'li'
      view.classList.add 'active' if item is active
      view.appendChild(@ink.matchHighlighter.highlightMatches(item, @selector.getFilterQuery(), 0))
      view

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
