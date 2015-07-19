module.exports =
  activate: ->
    @createUI()
    @reset 'Main', 'Lazy'

  deactivate: ->
    @tile?.destroy()
    @tile = null

  # UI

  createUI: ->
    @dom = document.createElement 'span'
    @dom.classList.add 'julia-client'
    @main = document.createElement 'a'
    @sub = document.createElement 'span'
    @divider = document.createElement 'span'
    @divider.innerText = '/'

  consumeStatusBar: (bar) ->
    @tile = bar.addRightTile {item: @dom}

  clear: -> @dom.innerHTML = ""

  reset: (main, sub) ->
    @clear()
    @main.innerText = main
    @sub.innerText = sub
    @dom.appendChild @main
    if sub
      @dom.appendChild @divider
      @dom.appendChild @sub
    @active()

  isSubInactive: false
  isInactive: false

  active: ->
    @isInactive = false
    @isSubInactive = false
    @main.classList.remove 'fade'
    @divider.classList.remove 'fade'
    @sub.classList.remove 'fade'
  subInactive: ->
    @active()
    @isSubInactive = true
    @sub.classList.add 'fade'
  inactive: ->
    @active()
    @isInactive = true
    @main.classList.add 'fade'
    @divider.classList.add 'fade'
    @sub.classList.add 'fade'
