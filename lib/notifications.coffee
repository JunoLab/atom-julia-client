remote = require('remote')
comm = require './connection/comm'

module.exports =
  notes: []
  window: remote.getCurrentWindow()

  activate: ->
    document.addEventListener 'focusin', =>
      @clear()
    @msgHandlers()

  enabled: () -> atom.config.get('julia-client.notifications')

  show: (msg) ->
    return unless @enabled and not document.hasFocus()
    n = new Notification "Julia Client",
      body: msg
      icon: @iconPath
    n.onclick = =>
      @window.focus()
    console.log n
    @notes.push(n)

  clear: ->
    for note in @notes
      note.close()
    @notes = []

  msgHandlers: ->
    comm.handle 'error', (options) =>
      atom.notifications.addError options.msg, options
