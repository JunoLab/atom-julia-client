# TODO: this code is awful, refactor

{CompositeDisposable, Disposable, Emitter} = require 'atom'
{debounce} = require 'underscore-plus'

{client} = require '../connection'
{show} = require '../ui/selector'

{module: getmodule, allmodules, ismodule} = client.import ['module', 'allmodules', 'ismodule']

module.exports =

  activate: ->
    @subs = new CompositeDisposable
    @itemSubs = new CompositeDisposable
    @subs.add @emitter = new Emitter

    @subs.add atom.workspace.observeActivePaneItem (item) => @updateForItem item
    @subs.add client.onAttached => @updateForItem()
    @subs.add client.onDetached => @updateForItem()

  deactivate: ->
    @subs.dispose()

  _current: null
  lastEditorModule: null

  setCurrent: (@_current, editor) ->
    if editor then @lastEditorModule = @_current
    @emitter.emit 'did-change', @_current

  onDidChange: (f) -> @emitter.on 'did-change', f

  current: (m = @_current) ->
    return unless m?
    {main, inactive, sub, subInactive} = m
    if main is @follow then return @current @lastEditorModule
    if not main or inactive
      "Main"
    else if not sub or subInactive
      main
    else
      "#{main}.#{sub}"

  # Choosing Modules

  itemSelector: 'atom-text-editor[data-grammar="source julia"], .julia-console.julia, ink-terminal, .ink-workspace'

  isValidItem: (item) -> atom.views.getView(item)?.matches @itemSelector

  autodetect: 'Auto Detect'
  follow: 'Follow Editor'

  chooseModule: ->
    item = atom.workspace.getActivePaneItem()
    ised = atom.workspace.isTextEditor item
    return unless @isValidItem item
    client.require 'change modules', =>
      if (item = atom.workspace.getActivePaneItem())
        active = item.juliaModule or (if ised then @autodetect else 'Main')
        modules = allmodules().then (modules) =>
          if ised
            modules.unshift @autodetect
          else if @lastEditorModule?
            modules.unshift @follow
          modules
        modules.catch (err) =>
          console.log err
        show(modules, { active }).then (mod) =>
          return unless mod?
          if mod is @autodetect
            delete item.juliaModule
          else
            item.juliaModule = mod
          item.setModule?(mod if mod isnt @autodetect)
          @updateForItem item

  updateForItem: (item = atom.workspace.getActivePaneItem()) ->
    @itemSubs.dispose()
    if not @isValidItem item
      @itemSubs.add item?.onDidChangeGrammar? => @updateForItem()
      @setCurrent()
    else if not client.isActive()
      @setCurrent main: 'Main', inactive: true
    else if atom.workspace.isTextEditor item
      @updateForEditor item
    else
      mod = item.juliaModule or 'Main'
      ismodule(mod)
        .then (ismod) =>
          @setCurrent main: mod, inactive: !ismod
        .catch (err) =>
          console.log err

  updateForEditor: (editor) ->
    @setCurrent main: editor.juliaModule or 'Main', true
    @setEditorModule editor
    @itemSubs.add editor.onDidChangeCursorPosition =>
      @setEditorModuleLazy editor

  getEditorModule: (ed, bufferPosition = null) ->
    return unless client.isActive()
    if bufferPosition
      {row, column} = bufferPosition
    else
      sels = ed.getSelections()
      {row, column} = sels[sels.length - 1].getBufferRange().end
    data =
      path: client.editorPath(ed)
      code: ed.getText()
      row: row+1, column: column+1
      module: ed.juliaModule
    getmodule(data)
      .catch (err) =>
        console.log err

  setEditorModule: (ed) ->
    modulePromise = @getEditorModule ed
    return unless modulePromise
    modulePromise.then (mod) =>
      if atom.workspace.getActivePaneItem() is ed
        @setCurrent mod, true

  setEditorModuleLazy: debounce ((ed) -> @setEditorModule(ed)), 100

  # The View

  activateView: ->
    @onDidChange (c) => @updateView c

    @dom = document.createElement 'span'
    @dom.classList.add 'julia', 'inline-block'

    @mainView = document.createElement 'a'
    @dividerView = document.createElement 'span'
    @subView = document.createElement 'span'

    @dom.appendChild x for x in [@mainView, @dividerView, @subView]

    @mainView.onclick = =>
      atom.commands.dispatch atom.views.getView(atom.workspace.getActivePaneItem()),
                             'julia-client:set-working-module'

    atom.tooltips.add @dom,
      title: => "Currently working in module #{@current()}"

    # @NOTE: Grammar selector has `priority` 10 and thus set the it to a bit lower
    #        than that to avoid collision that may cause unexpected result.
    @tile = @statusBar.addRightTile item: @dom, priority: 5
    disposable = new Disposable(=>
      @tile.destroy()
      delete @tile)
    @subs.add(disposable)
    disposable

  updateView: (m = @_current) ->
    return unless @tile?
    if not m?
      @dom.style.display = 'none'
    else
      {main, sub, inactive, subInactive} = m
      if main is @follow
        return @updateView @lastEditorModule
      @dom.style.display = ''
      @mainView.innerText = 'Module: ' + (main or 'Main')
      if sub
        @subView.innerText = sub
        @dividerView.innerText = '/'
      else
        view.innerText = '' for view in [@subView, @dividerView]
      if inactive
        @dom.classList.add 'fade'
      else
        @dom.classList.remove 'fade'
        for view in [@subView, @dividerView]
          if subInactive
            view.classList.add 'fade'
          else
            view.classList.remove 'fade'

  consumeStatusBar: (bar) ->
    @statusBar = bar
    disposable = @activateView()
    @updateView @_current
    disposable
