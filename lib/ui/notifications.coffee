remote = require 'remote'

module.exports =
  notes: []
  window: remote.getCurrentWindow()

  activate: ->
    document.addEventListener 'focusin', =>
      @clear()

  enabled: -> atom.config.get('julia-client.notifications')

  show: (msg) ->
    return unless @enabled() and not document.hasFocus()
    n = new Notification "Julia Client",
      body: msg
      icon: @iconPath
    n.onclick = =>
      @window.focus()
    @notes.push(n)

  clear: ->
    for note in @notes
      note.close()
    @notes = []
