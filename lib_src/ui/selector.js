/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { SelectListView } from 'atom-space-pen-views';

export default {
  show(xs, {active, emptyMessage, allowCustom} = {}) {
    const selector = new SelectListView;
    selector.addClass('command-palette');
    selector.addClass('julia-clientselector');
    if (active) { selector.list.addClass('mark-active'); }
    selector.getEmptyMessage = () => emptyMessage || '';

    selector.setItems([]);
    selector.storeFocusedElement();
    selector.viewForItem = item => {
      let name = item;
      if (item instanceof Object) {
        name = item.primary;
      }
      const view = document.createElement('li');
      if (item === active) { view.classList.add('active'); }
      const primary = this.ink.matchHighlighter.highlightMatches(name, selector.getFilterQuery(), 0);
      view.appendChild(primary);
      if (item.secondary) {
        view.classList.add('two-lines');
        primary.classList.add('primary-line');

        const secondary = document.createElement('div');
        secondary.classList.add('secondary-line', 'path');
        secondary.innerText = item.secondary;
        view.appendChild(secondary);
      }
      return view;
    };

    const panel = atom.workspace.addModalPanel({item: selector});
    selector.focusFilterEditor();

    let confirmed = false;

    return new Promise((resolve, reject) => {
      if (xs.constructor === Promise) {
        selector.setLoading("Loading...");
        xs.then(xs => {
          if ((xs.length > 0) && xs[0] instanceof Object) {
            selector.getFilterKey = () => 'primary';
          }
          return selector.setItems(xs);
        });
        xs.catch(e => {
          reject(e);
          return selector.cancel();
        });
      } else {
        if ((xs.length > 0) && xs[0] instanceof Object) {
          selector.getFilterKey = () => 'primary';
        }
        selector.setItems(xs);
      }

      selector.confirmed = item => {
        confirmed = true;
        selector.cancel();
        return resolve(item);
      };
      return selector.cancelled = () => {
        panel.destroy();
        selector.restoreFocus();
        const query = selector.getFilterQuery();
        if (!confirmed) {
          if (allowCustom && (query.length > 0)) {
            return resolve(query);
          } else {
            return resolve();
          }
        }
      };
    });
  }
};
