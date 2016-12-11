module.exports =
  consumeToolBar: (bar) ->
    return unless atom.config.get 'julia-client.enableToolBar'

    @bar = bar 'julia-client'

    # Files & Folders

    @bar.addButton
      icon: 'document'
      callback: ->
        atom.workspace.open().then (ed) ->
          ed.setGrammar(atom.grammars.grammarForScopeName('source.julia'))
      tooltip: 'New Julia File'
      iconset: 'ion'

    @bar.addButton
      icon: 'floppy-o'
      callback: 'core:save'
      tooltip: 'Save'
      iconset: 'fa'

    @bar.addButton
      icon: 'folder'
      callback: 'application:open-file'
      tooltip: 'Open File...'
      iconset: 'ion'

    @bar.addSpacer()

    # Windows & Panes

    @bar.addButton
      icon: 'terminal'
      callback: 'julia-client:open-console'
      tooltip: 'Show Console'

    @bar.addButton
      icon: 'graph'
      callback: 'julia-client:open-plot-pane'
      tooltip: 'Show Plots'

    @bar.addButton
      icon: 'book'
      callback: 'julia-client:open-workspace'
      tooltip: 'Show Workspace'

    @bar.addSpacer()

    # Evaluation

    @bar.addButton
      icon: 'zap'
      callback: 'julia-client:run-and-move'
      tooltip: 'Run Block'

    @bar.addButton
      icon: 'play'
      callback: 'julia-client:run-file'
      tooltip: 'Run File'
      iconset: 'ion'

    @bar.addButton
      icon: 'stop'
      callback: 'julia-client:kill-julia'
      tooltip: 'Stop Julia'
      iconset: 'ion'

  deactivate: ->
    @bar?.removeItems()
