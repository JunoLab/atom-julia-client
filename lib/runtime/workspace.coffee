{CompositeDisposable} = require 'atom'

module.exports =
  activate: ->
    @create()

    @subs = new CompositeDisposable

    @subs.add atom.workspace.addOpener (uri) =>
      if uri is 'atom://julia-client/workspace'
        @ws

  deactivate: ->
    @subs.dispose()

  create: ->
    @ws = @ink.Workspace.fromId 'julia'

  open: ->
    @ws.open ||
      atom.workspace.open 'atom://julia-client/workspace'
