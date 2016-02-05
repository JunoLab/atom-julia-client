{CompositeDisposable, Emitter} = require 'atom'
{debounce} = require 'underscore-plus'

{client} = require '../connection'
{selector} = require '../ui'

{module: getmodule, allmodules} = client.import ['module', 'allmodules']

module.exports =

  activate: ->
    @subs = new CompositeDisposable
    @itemSubs = new CompositeDisposable
    @emitter = new Emitter

    @subs.add atom.workspace.observeActivePaneItem (item) => @updateForItem item
    @subs.add client.onConnected => @updateForItem()
    @subs.add client.onDisconnected => @updateForItem()

    @onDidChange (c) -> console.log c

    # @createStatusUI()

  deactivate: ->
    @subs.dispose()

  _current: null

  setCurrent: (@_current) -> @emitter.emit 'did-change', @_current

  onDidChange: (f) -> @emitter.on 'did-change', f

  currentModule: ->
    return unless @_current?
    {main, inactive, sub, subInactive} = @_current
    if not main or inactive
      "Main"
    else if not sub or subInactive
      main
    else
      "#{main}.#{sub}"

  # Choosing Modules

  itemSelector: 'atom-text-editor[data-grammar="source julia"], ink-console.julia'

  isValidItem: (item) -> atom.views.getView(item)?.matches @itemSelector

  autodetect: 'Auto Detect'
  follow: 'Follow Editor'

  chooseModule: ->
    item = atom.workspace.getActivePaneItem()
    ised = atom.workspace.isTextEditor item
    return unless @isValidItem item
    client.require =>
      if (item = atom.workspace.getActivePaneItem())
        modules = allmodules().then (modules) =>
          modules.unshift @autodetect if ised
          modules
        selector.show(modules).then (mod) =>
          return unless mod?
          if mod is @autodetect
            delete item.juliaModule
          else
            item.juliaModule = mod
          @updateForItem item

  updateForItem: (item = atom.workspace.getActivePaneItem()) ->
    @itemSubs.dispose()
    if not @isValidItem item
      @itemSubs.add item?.onDidChangeGrammar? => @updateForItem()
      @setCurrent()
    else if not client.isConnected()
      @setCurrent main: 'Main', inactive: true
    else if atom.workspace.isTextEditor item
      @updateForEditor item
    else
      @setCurrent main: item.juliaModule or 'Main'

  updateForEditor: (editor) ->
    @setCurrent main: editor.juliaModule or 'Main'
    @getEditorModule editor
    @itemSubs.add editor.onDidChangeCursorPosition =>
      @getEditorModuleLazy editor

  getEditorModule: (ed) ->
    {row, column} = ed.getCursors()[0].getBufferPosition()
    data =
      path: ed.getPath()
      code: ed.getText()
      row: row+1, column: column+1
      module: ed.juliaModule

    getmodule(data).then (mod) =>
      if atom.workspace.getActivePaneItem() is ed
        @setCurrent mod

  getEditorModuleLazy: debounce ((ed) -> @getEditorModule(ed)), 100

  # The View

  # createStatusUI: ->
  #   @dom = document.createElement 'span'
  #   @dom.classList.add 'julia', 'inline-block'
  #
  #   main = document.createElement 'a'
  #   main.classList.add 'main'
  #
  #   divider = document.createElement 'span'
  #   divider.classList.add 'divider'
  #
  #   sub = document.createElement 'span'
  #   sub.classList.add 'sub'
  #
  #   @dom.appendChild x for x in [main, divider, sub]
  #
  #   main.onclick = =>
  #     atom.commands.dispatch atom.views.getView(atom.workspace.getActivePaneItem()),
  #                            'julia-client:set-working-module'
  #
  #   atom.tooltips.add @dom,
  #     title: => "Currently working in module #{@currentModule()}"

  consumeStatusBar: (bar) ->
    # @statusBar = bar
    # @updateView()
