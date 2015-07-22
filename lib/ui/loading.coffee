fs = require 'fs'
path = require 'path'

module.exports =
  status: 0

  working: -> @status++; @update()
  done: -> if @status > 0 then @status--; @update()
  reset: -> @status = 0; @update()

  isWorking: -> @status > 0

  ui: ->
    ui = document.createElement 'div'
    ui.classList.add 'julia-client'
    ui.classList.add 'loading'
    ui.innerHTML = """<div class="sk-folding-cube">
                        <div class="sk-cube1 sk-cube"></div>
                        <div class="sk-cube2 sk-cube"></div>
                        <div class="sk-cube4 sk-cube"></div>
                        <div class="sk-cube3 sk-cube"></div>
                      </div>
                  """
    # ui.innerHTML = "loading..."
    ui.appendChild @style()
    ui

  uis: []

  insert: (ed) ->
    ui = @ui()
    @uis.push(ui)
    atom.views.getView(ed).rootElement.appendChild ui

  on: (ed) ->
    return if @edSubscription?
    @edSubscription = atom.workspace.observeTextEditors (ed) =>
      return unless ed.getGrammar().scopeName == 'source.julia'
      @insert ed

  off: ->
    for ui in @uis
      ui.parentElement?.removeChild(ui)
    @uis = []
    @edSubscription?.dispose()
    @edSubscription = null

  update: ->
    if not @css? then return @loadCSS => @update()

    if @isWorking()
      @on()
    else
      @off()

  timeout: (t, f) -> setTimeout f, t

  loadCSS: (cb) ->
    file = path.resolve __dirname, '..', '..', 'styles', 'spinner.css'
    fs.readFile file, (err, data) =>
      @css = data.toString()
      cb?()

  style: () ->
    style = document.createElement 'style'
    style.innerText = @css
    style
