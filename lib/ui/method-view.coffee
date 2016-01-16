{$$, SelectListView} = require 'atom-space-pen-views'

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
    $$ ->
      @li class: 'two-lines', =>
        @div signature, class: 'primary-line'
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
