'use babel'
import { CompositeDisposable, Disposable } from 'atom';

export default {
  // TODO Fix all of these dynamic requires and circular dependencies
  notifications: require('./ui/notifications'),
  selector:      require('./ui/selector'),
  views:         require('./ui/views'),
  progress:      require('./ui/progress'),
  layout:        require('./ui/layout'),
  docpane:       require('./ui/docs'),
  focusutils:    require('./ui/focusutils'),
  cellhighlighter:    require('./ui/cellhighlighter'),

  activate(client) {
    this.client = client;
    this.subs = new CompositeDisposable;

    this.notifications.activate();
    this.subs.add(atom.config.observe('julia-client.uiOptions.highlightCells', val => {
        if (val) {
          this.cellhighlighter.activate();
        } else {
          this.cellhighlighter.deactivate();
        }
      })
    );
    this.subs.add(new Disposable(() => {
        this.cellhighlighter.deactivate();
      })
    );

    this.subs.add(this.client.onAttached(() => {
        this.notifications.show("Client Connected");
      })
    );
    this.subs.add(this.client.onDetached(() => {
        // TODO do we need this optional chaining check?
        this.ink && this.ink.Result && this.ink.Result.invalidateAll()
      })
    );
  },

  deactivate() {
    this.subs.dispose();
  },

  consumeInk(ink) {
    this.ink = ink;
    this.views.ink = this.ink;
    this.selector.activate(this.ink);
    this.docpane.activate(this.ink);
    this.progress.activate(this.ink);
    this.focusutils.activate(this.ink);
    this.subs.add(new Disposable(() => {
      this.docpane.deactivate();
      this.progress.deactivate();
      this.focusutils.deactivate();
    }));
  }
};
