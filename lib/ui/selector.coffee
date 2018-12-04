{SelectListView} = require 'atom-space-pen-views'

module.exports =
  show: (xs, {active} = {}) ->
    @selector ?= new SelectListView
    @selector.addClass('command-palette')
    @selector.addClass('julia-client-selector')
    @selector.list.addClass('mark-active') if active

    @selector.setItems []
    @selector.storeFocusedElement()
    @selector.viewForItem = (item) =>
      name = item
      if item instanceof Object
        name = item.primary
      view = document.createElement 'li'
      view.classList.add 'active' if item is active
      primary = @ink.matchHighlighter.highlightMatches(name, @selector.getFilterQuery(), 0)
      view.appendChild(primary)
      if item.secondary
        view.classList.add('two-lines')
        primary.classList.add('primary-line')

        secondary = document.createElement 'div'
        secondary.classList.add('secondary-line', 'path')
        secondary.innerText = item.secondary
        view.appendChild(secondary)
      view

    panel = atom.workspace.addModalPanel(item: @selector)
    @selector.focusFilterEditor()

    confirmed = false

    new Promise (resolve, reject) =>
      if xs.constructor == Promise
        @selector.setLoading "Loading..."
        xs.then (xs) =>
          if xs.length > 0 and xs[0] instanceof Object
            @selector.getFilterKey = => 'primary'
          @selector.setItems xs
        xs.catch (e) =>
          reject e
          @selector.cancel()
      else
        if xs.length > 0 and xs[0] instanceof Object
          @selector.getFilterKey = => 'primary'
        @selector.setItems xs

      @selector.confirmed = (item) =>
        confirmed = true
        @selector.cancel()
        resolve item
      @selector.cancelled = =>
        panel.destroy()
        @selector.restoreFocus()
        resolve() unless confirmed
