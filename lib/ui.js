'use babel'
import { CompositeDisposable, Disposable } from 'atom';

// TODO use babel to export ... from ...
import notifications from './ui/notifications'
import * as selector from './ui/selector'
import views from './ui/views'
import progress from './ui/progress'
import * as layout from './ui/layout'
import * as docpane from './ui/docs'
import * as focusutils from './ui/focusutils'
import * as cellhighlighter from './ui/cellhighlighter'

export default {
  // TODO remove these from the export default and export them directly (prevents expensive copy)
  // TODO don't use this.message use message directly (prevents expensive copy)
  notifications:     notifications,
  selector:          selector,
  views:             views,
  progress:          progress,
  layout:            layout,
  docpane:           docpane,
  focusutils:        focusutils,
  cellhighlighter:   cellhighlighter,

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
    subs.add(client.onDetached(() => {
        if (ink) {
          ink.Result.invalidateAll()
        }
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
