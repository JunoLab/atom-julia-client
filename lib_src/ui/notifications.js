import remote from 'remote';

export default {
  // notes: []
  // window: remote.getCurrentWindow()

  activate() {},
    // document.addEventListener 'focusin', =>
    //   @clear()

  enabled() { return atom.config.get('julia-client.uiOptions.notifications'); },

  show(msg, force) {}
};
// return unless force or (@enabled() and not document.hasFocus())
// n = new Notification "Julia Client",
//   body: msg
// n.onclick = =>
//   @window.focus()
// @notes.push(n)

// clear: ->
//   for note in @notes
//     note.close()
//   @notes = []
