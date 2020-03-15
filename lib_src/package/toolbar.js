/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
export default {
  consumeToolBar(bar) {
    if (!atom.config.get('julia-client.uiOptions.enableToolBar')) { return; }

    this.bar = bar('julia-client');

    // Files & Folders

    this.bar.addButton({
      icon: 'file-code',
      iconset: 'fa',
      tooltip: 'New Julia File',
      callback: 'julia:new-julia-file'
    });

    this.bar.addButton({
      icon: 'save',
      iconset: 'fa',
      tooltip: 'Save',
      callback: 'core:save'
    });

    this.bar.addButton({
      icon: 'folder-open',
      iconset: 'fa',
      tooltip: 'Open File...',
      callback: 'application:open-file'
    });

    // Julia process

    this.bar.addSpacer();

    this.bar.addButton({
      icon: 'globe',
      tooltip: 'Start Local Julia Process',
      callback: 'julia-client:start-julia'
    });

    this.bar.addButton({
      iconset: 'ion',
      icon: 'md-planet',
      tooltip: 'Start Remote Julia Process',
      callback: 'julia-client:start-remote-julia-process'
    });

    this.bar.addButton({
      icon: 'md-pause',
      iconset: 'ion',
      tooltip: 'Interrupt Julia',
      callback: 'julia-client:interrupt-julia'
    });

    this.bar.addButton({
      icon: 'md-square',
      iconset: 'ion',
      tooltip: 'Stop Julia',
      callback: 'julia-client:kill-julia'
    });

    // Evaluation

    this.bar.addSpacer();

    this.bar.addButton({
      icon: 'zap',
      tooltip: 'Run Block',
      callback: 'julia-client:run-and-move'
    });

    this.bar.addButton({
      icon: 'md-play',
      iconset: 'ion',
      tooltip: 'Run All',
      callback: 'julia-client:run-all'
    });

    this.bar.addButton({
      icon: 'format-float-none',
      iconset: 'mdi',
      tooltip: 'Format Code',
      callback: 'julia-client:format-code'
    });

    // Windows & Panes

    this.bar.addSpacer();

    this.bar.addButton({
      icon: 'terminal',
      tooltip: 'Show REPL',
      callback: 'julia-client:open-REPL'
    });

    this.bar.addButton({
      icon: 'book',
      tooltip: 'Show Workspace',
      callback: 'julia-client:open-workspace'
    });

    this.bar.addButton({
      icon: 'list-unordered',
      tooltip: 'Show Outline',
      callback: 'julia-client:open-outline-pane'
    });

    this.bar.addButton({
      icon: 'info',
      tooltip: 'Show Documentation Browser',
      callback: 'julia-client:open-documentation-browser'
    });

    this.bar.addButton({
      icon: 'graph',
      tooltip: 'Show Plot Pane',
      callback: 'julia-client:open-plot-pane'
    });

    return this.bar.addButton({
      icon: 'bug',
      tooltip: 'Show Debugger Pane',
      callback: 'julia-debug:open-debugger-pane'
    });
  },

  deactivate() {
    return (this.bar != null ? this.bar.removeItems() : undefined);
  }
};
