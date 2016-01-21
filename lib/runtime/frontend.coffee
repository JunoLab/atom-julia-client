remote = require 'remote'
BrowserWindow = remote.require 'browser-window'
vm = require 'vm'

{client} = require '../connection'
{selector} = require '../ui'

module.exports =

  evalwith: (obj, code) ->
    vm.runInThisContext("(function(){return #{code}})").call obj

  windows: {}

  activate: ->
    client.handle 'select', (items) -> selector.show items

    # Blink APIs

    client.handle 'createWindow', (opts) =>
      w = new BrowserWindow opts
      if opts.url?
        w.loadUrl opts.url
      w.setMenu(null)
      @windows[w.id] = w
      w.on 'close', => delete @windows[w.id]
      return w.id

    client.handle 'withWin', (id, code) =>
      @evalwith @windows[id], code

    client.handle 'winActive', (id) =>
      @windows.hasOwnProperty id

    client.onDisconnected =>
      for id, win of @windows
        delete @windows[id]
        win.close()
