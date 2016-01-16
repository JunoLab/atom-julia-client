{$$, SelectListView} = require 'atom-space-pen-views'
fuzzaldrinPlus = require 'fuzzaldrin-plus'

module.exports =
displayMethodView: (promise) ->
  @view ?= new MethodView()
  @view.setLoading "Loading..."
  @view.show()
  promise.then (items) =>
    if items.error
      @view.setError(items.result)
    else
      @view.setItems(items.result)

class MethodView extends SelectListView
  initialize: ->
    super
    @panel = atom.workspace.addModalPanel(item: this, visible: false)
    @addClass('command-palette')
    @addClass('ink')

  destroy: ->
    @cancel()
    @panel.destroy()

  # An item has four fields:
  #   .signature: Method signature, searchable and displayed.
  #   .file:      File in which this method is defined, not displayed.
  #   .dispfile:  Humanized file path, displayed.
  #   .line:      Line of definition.
  viewForItem: ({signature, dispfile, line}) ->
    # the highlighting is taken from https://github.com/atom/command-palette
    filterQuery = @getFilterQuery()
    matches = fuzzaldrinPlus.match(signature, filterQuery)

    $$ ->
      highlighter = (command, matches, offsetIndex) =>
        lastIndex = 0
        matchedChars = [] # Build up a set of matched chars to be more semantic

        for matchIndex in matches
          matchIndex -= offsetIndex
          continue if matchIndex < 0 # If marking up the basename, omit command matches
          unmatched = command.substring(lastIndex, matchIndex)
          if unmatched
            @span matchedChars.join(''), class: 'character-match' if matchedChars.length
            matchedChars = []
            @text unmatched
          matchedChars.push(command[matchIndex])
          lastIndex = matchIndex + 1

        @span matchedChars.join(''), class: 'character-match' if matchedChars.length

        # Remaining characters are plain text
        @text command.substring(lastIndex)

      @li class: 'two-lines', =>
        @div class: 'primary-line', -> highlighter(signature, matches, 0)
        @div dispfile + ":" + line, class: 'secondary-line'

  getFilterKey: -> 'signature'

  populate: (items) ->
    @setItems(items)
    @show()

  show: () ->
    @storeFocusedElement()
    @panel.show()
    @focusFilterEditor()

  hide: () ->
    @panel?.hide()

  confirmed: (item) ->
    atom.workspace.open item.file,
      initialLine: item.line
    @hide()

  cancelled: ->
    @hide()
