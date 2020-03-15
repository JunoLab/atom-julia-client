/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { CompositeDisposable, Disposable } from 'atom';

export default {
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
        return this.cellhighlighter.activate();
      } else {
        return this.cellhighlighter.deactivate();
      }
    })
    );
    this.subs.add(new Disposable(() => {
      return this.cellhighlighter.deactivate();
    })
    );

    this.subs.add(this.client.onAttached(() => {
      return this.notifications.show("Client Connected");
    })
    );
    return this.subs.add(this.client.onDetached(() => {
      return (this.ink != null ? this.ink.Result.invalidateAll() : undefined);
    })
    );
  },

  deactivate() {
    return this.subs.dispose();
  },

  consumeInk(ink) {
    this.ink = ink;
    this.views.ink = this.ink;
    this.selector.ink = this.ink;
    this.progress.ink = this.ink;
    this.docpane.activate(this.ink);
    this.progress.activate();
    this.focusutils.activate(this.ink);
    return this.subs.add(new Disposable(() => {
      this.docpane.deactivate();
      this.progress.deactivate();
      return this.focusutils.deactivate();
  }));
  }
};
