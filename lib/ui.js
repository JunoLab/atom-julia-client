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

let client;
let subs;
let ink;

export function activate(client_in) {
    client = client_in;
    subs = new CompositeDisposable;

    notifications.activate();
    subs.add(atom.config.observe('julia-client.uiOptions.highlightCells', val => {
        if (val) {
          cellhighlighter.activate();
        } else {
          cellhighlighter.deactivate();
        }
      })
    );
    subs.add(new Disposable(() => {
        cellhighlighter.deactivate();
      })
    );

    subs.add(client.onAttached(() => {
        notifications.show("Client Connected");
      })
    );
    subs.add(client.onDetached(() => {
        if (ink) {
          ink.Result.invalidateAll()
        }
      })
    );
}

export function deactivate() {
    subs.dispose();
}

export function consumeInk(ink_in) {
    ink = ink_in;
    views.ink = ink;
    selector.activate(ink);
    docpane.activate(ink);
    progress.activate(ink);
    focusutils.activate(ink);
    subs.add(new Disposable(() => {
      docpane.deactivate();
      progress.deactivate();
      focusutils.deactivate();
    }));
}

exports.notifications = notifications
exports.selector = selector
exports.views = views
exports.progress = progress
exports.layout = layout
exports.docpane = docpane
exports.focusutils = focusutils
exports.cellhighlighter = cellhighlighter
