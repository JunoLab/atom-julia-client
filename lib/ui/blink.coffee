remote = require 'remote'
BrowserWindow = remote.require 'browser-window'
vm = require 'vm'

client = require '../connection/client'

evalwith = (obj, code) ->
  vm.runInThisContext("(function(){return #{code}})").call obj

windows = {}

client.handle 'createWindow', (opts) ->
  w = new BrowserWindow opts
  if opts.url?
    w.loadUrl opts.url
  w.setMenu(null)
  windows[w.id] = w
  w.on 'close', -> delete windows[w.id]
  return w.id

client.handle 'withWin', (id, code) ->
  evalwith windows[id], code

client.onDisconnected ->
  for id, win of windows
    delete windows[id]
    win.close()
