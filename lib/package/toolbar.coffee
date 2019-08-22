module.exports =
  consumeToolBar: (bar) ->
    return unless atom.config.get 'julia-client.uiOptions.enableToolBar'

    @bar = bar 'julia-client'

    # Files & Folders

    @bar.addButton
      icon: 'file-code'
      iconset: 'fa'
      tooltip: 'New Julia File'
      callback: ->
        atom.workspace.open().then (ed) ->
          ed.setGrammar(atom.grammars.grammarForScopeName('source.julia'))

    @bar.addButton
      icon: 'save'
      iconset: 'fa'
      tooltip: 'Save'
      callback: 'core:save'

    @bar.addButton
      icon: 'folder-open'
      iconset: 'fa'
      tooltip: 'Open File...'
      callback: 'application:open-file'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'file-submodule'
          tooltip: 'Open Folder...'
          callback: 'application:open-folder'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'file-symlink-directory'
          tooltip: 'Select Working Directory...'
          callback: 'julia-client:select-working-folder'

    # Julia process

    @bar.addSpacer()

    @bar.addButton
      icon: 'globe'
      tooltip: 'Start Local Julia Process'
      callback: 'julia-client:start-julia'

    @bar.addButton
      iconset: 'ion'
      icon: 'planet'
      tooltip: 'Start Remote Julia Process'
      callback: 'julia-client:start-remote-julia-process'

    @bar.addButton
      icon: 'pause'
      iconset: 'ion'
      tooltip: 'Interrupt Julia'
      callback: 'julia-client:interrupt-julia'

    @bar.addButton
      icon: 'stop'
      iconset: 'ion'
      tooltip: 'Stop Julia'
      callback: 'julia-client:kill-julia'

    # Evaluation

    @bar.addSpacer()

    @bar.addButton
      icon: 'zap'
      tooltip: 'Run Block'
      callback: 'julia-client:run-and-move'

    @bar.addButton
      icon: 'play'
      iconset: 'ion'
      tooltip: 'Run All'
      callback: 'julia-client:run-all'

    # Code Tools

    @bar.addSpacer()

    @bar.addButton
      icon: 'format-float-none'
      iconset: 'mdi'
      tooltip: 'Format Code'
      callback: 'julia-client:format-code'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'indent'
          callback: 'editor:auto-indent'
          tooltip: 'Auto indent (selection)'
          iconset: 'fa'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'chevron-right'
          callback: 'editor:fold-all'
          tooltip: 'Fold all'
          iconset: 'fa'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'chevron-down'
          callback: 'editor:unfold-all'
          tooltip: 'Unfold all'
          iconset: 'fa'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'question'
          tooltip: 'Show Documentation [Selection]'
          callback: 'julia-client:show-documentation'

    # Windows & Panes

    @bar.addSpacer()

    @bar.addButton
      icon: 'terminal'
      tooltip: 'Show Console'
      callback: 'julia-client:open-console'

    @bar.addButton
      icon: 'book'
      tooltip: 'Show Workspace'
      callback: 'julia-client:open-workspace'

    @bar.addButton
      icon: 'info'
      tooltip: 'Show Documentation Browser'
      callback: 'julia-client:open-documentation-browser'

    @bar.addButton
      icon: 'graph'
      tooltip: 'Show Plots'
      callback: 'julia-client:open-plot-pane'

    @bar.addButton
      icon: 'bug'
      tooltip: 'Show Debugger Pane'
      callback: 'julia-debug:open-debugger-pane'


    # Viewers

    @bar.addSpacer()

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
      if atom.packages.loadedPackages['markdown-preview']
        @bar.addButton
          icon: 'markdown'
          callback: 'markdown-preview:toggle'
          tooltip: 'Markdown Preview'


    # Atom

    @bar.addSpacer()

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'tools'
          iconset: 'fa'
          tooltip: 'Julia Client Settings...'
          callback: 'julia-client:settings'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'gear'
          callback: 'settings-view:open'
          tooltip: 'Open Settings View'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          iconset: 'fa'
          icon: 'arrows-alt'
          tooltip: 'Toggle Fullscreen'
          callback: 'window:toggle-full-screen'

    if atom.config.get 'julia-client.uiOptions.enableExtraToolbarButtons'
        @bar.addButton
          icon: 'navicon-round'
          callback: 'command-palette:toggle'
          tooltip: 'Toggle Command Palette'
          iconset: 'ion'


  deactivate: ->
    @bar?.removeItems()
