remote = require('remote')
client = require '../connection/client'

module.exports =
  notes: []
  window: remote.getCurrentWindow()

  activate: ->
    document.addEventListener 'focusin', =>
      @clear()
    @msgHandlers()

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

  msgHandlers: ->
    client.handle 'error', (options) =>
      atom.notifications.addError options.msg, options
