comm = require '../connection/comm'

module.exports =
  activate: () ->
    comm.handle 'show-block', ({start, end}) =>
      @highlight atom.workspace.getActiveTextEditor(), start-1, end-1

  timeout: (t, f) -> setTimeout f, t

  highlight: (ed, start, end) ->
    m = ed.markBufferRange [[start, 0], [end+1, 0]]
    d = ed.decorateMarker m,
          type: 'highlight'
          class: 'block-notify'
    @timeout 20, =>
      for region in atom.views.getView(ed).rootElement.querySelectorAll '.block-notify'
        region.classList.add 'hidden'
    @timeout 320, =>
      m.destroy()
