{BrowserWindow} = require('electron').remote
vm = require 'vm'

{client} = require '../connection'
{selector, notifications} = require '../ui'
{colors} = require '../misc'

module.exports =
  evalwith: (obj, code) ->
    vm.runInThisContext("(function(){return #{code}})").call obj

  windows: {}

  activate: ->
    client.handle select: (items) -> selector.show items

    client.handle syntaxcolors: (selectors) -> colors.getColors(selectors)

    client.handle openFile: (file, line) => @ink?.Opener.open(file, line, {
      pending: atom.config.get('julia-client.uiOptions.pendingOpen')
    })

    # Blink APIs

    client.handle
      createWindow: (opts) =>
        w = new BrowserWindow opts
        if opts.url?
          w.loadURL opts.url
        w.setMenu(null)
        wid = w.id
        @windows[wid] = w
        w.on 'close', => delete @windows[wid]
        return wid

      withWin: (id, code) =>
        @evalwith @windows[id], code

      winActive: (id) =>
        @windows.hasOwnProperty id

      notify: (msg) ->
        notifications.show msg, true


    client.onDetached =>
      for id, win of @windows
        delete @windows[id]
        win.close()

  deactivate: ->
    for id, win of @windows
      win.close()
