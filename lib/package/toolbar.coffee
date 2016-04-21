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
      tooltip: 'Open Console'

    @bar.addButton
      icon: 'graph'
      callback: 'julia-client:open-plot-pane'
      tooltip: 'Show Plots'

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

    @bar.addSpacer()

    # Debugging

    @bar.addButton
      icon: 'arrow-down'
      callback: 'julia-debug:step-to-next-line'
      tooltip: 'Debug: Step to Next Line'

    @bar.addButton
      icon: 'link-external'
      callback: 'julia-debug:finish-function'
      tooltip: 'Debug: Finish Function'

    @bar.addButton
      icon: 'chevron-right'
      callback: 'julia-debug:step-into-function'
      tooltip: 'Debug: Step Into Function'

  deactivate: ->
    @bar?.removeItems()
