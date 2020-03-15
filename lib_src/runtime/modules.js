/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// TODO: this code is awful, refactor

import { CompositeDisposable, Disposable, Emitter } from 'atom';

import { debounce } from 'underscore-plus';
import { client } from '../connection';
import { selector } from '../ui';

const {module: getmodule, allmodules, ismodule} = client.import(['module', 'allmodules', 'ismodule']);

export default {

  activate() {
    this.subs = new CompositeDisposable;
    this.itemSubs = new CompositeDisposable;
    this.subs.add(this.emitter = new Emitter);

    this.subs.add(atom.workspace.observeActivePaneItem(item => this.updateForItem(item)));
    this.subs.add(client.onAttached(() => this.updateForItem()));
    return this.subs.add(client.onDetached(() => this.updateForItem()));
  },

  deactivate() {
    return this.subs.dispose();
  },

  _current: null,
  lastEditorModule: null,

  setCurrent(_current, editor) {
    this._current = _current;
    if (editor) { this.lastEditorModule = this._current; }
    return this.emitter.emit('did-change', this._current);
  },

  onDidChange(f) { return this.emitter.on('did-change', f); },

  current(m = this._current) {
    if (m == null) { return; }
    const {main, inactive, sub, subInactive} = m;
    if (main === this.follow) { return this.current(this.lastEditorModule); }
    if (!main || inactive) {
      return "Main";
    } else if (!sub || subInactive) {
      return main;
    } else {
      return `${main}.${sub}`;
    }
  },

  // Choosing Modules

  itemSelector: 'atom-text-editor[data-grammar="source julia"], .julia-console.julia, ink-terminal, .ink-workspace',

  isValidItem(item) { return __guard__(atom.views.getView(item), x => x.matches(this.itemSelector)); },

  autodetect: 'Auto Detect',
  follow: 'Follow Editor',

  chooseModule() {
    let item = atom.workspace.getActivePaneItem();
    const ised = atom.workspace.isTextEditor(item);
    if (!this.isValidItem(item)) { return; }
    return client.require('change modules', () => {
      if (item = atom.workspace.getActivePaneItem()) {
        const active = item.juliaModule || (ised ? this.autodetect : 'Main');
        const modules = allmodules().then(modules => {
          if (ised) {
            modules.unshift(this.autodetect);
          } else if (this.lastEditorModule != null) {
            modules.unshift(this.follow);
          }
          return modules;
        });
        modules.catch(err => {
          return console.log(err);
        });
        return selector.show(modules, {active}).then(mod => {
          if (mod == null) { return; }
          if (mod === this.autodetect) {
            delete item.juliaModule;
          } else {
            item.juliaModule = mod;
          }
          if (typeof item.setModule === 'function') {
            item.setModule(mod !== this.autodetect ? mod : undefined);
          }
          return this.updateForItem(item);
        });
      }
    });
  },

  updateForItem(item = atom.workspace.getActivePaneItem()) {
    this.itemSubs.dispose();
    if (!this.isValidItem(item)) {
      this.itemSubs.add(__guardMethod__(item, 'onDidChangeGrammar', o => o.onDidChangeGrammar(() => this.updateForItem())));
      return this.setCurrent();
    } else if (!client.isActive()) {
      return this.setCurrent({main: 'Main', inactive: true});
    } else if (atom.workspace.isTextEditor(item)) {
      return this.updateForEditor(item);
    } else {
      const mod = item.juliaModule || 'Main';
      return ismodule(mod)
        .then(ismod => {
          return this.setCurrent({main: mod, inactive: !ismod});
      }).catch(err => {
          return console.log(err);
      });
    }
  },

  updateForEditor(editor) {
    this.setCurrent({main: editor.juliaModule || 'Main'}, true);
    this.setEditorModule(editor);
    return this.itemSubs.add(editor.onDidChangeCursorPosition(() => {
      return this.setEditorModuleLazy(editor);
    })
    );
  },

  getEditorModule(ed, bufferPosition = null) {
    let column, row;
    if (!client.isActive()) { return; }
    if (bufferPosition) {
      ({row, column} = bufferPosition);
    } else {
      const sels = ed.getSelections();
      ({row, column} = sels[sels.length - 1].getBufferRange().end);
    }
    const data = {
      path: client.editorPath(ed),
      code: ed.getText(),
      row: row+1, column: column+1,
      module: ed.juliaModule
    };
    return getmodule(data)
      .catch(err => {
        return console.log(err);
    });
  },

  setEditorModule(ed) {
    const modulePromise = this.getEditorModule(ed);
    if (!modulePromise) { return; }
    return modulePromise.then(mod => {
      if (atom.workspace.getActivePaneItem() === ed) {
        return this.setCurrent(mod, true);
      }
    });
  },

  setEditorModuleLazy: debounce((function(ed) { return this.setEditorModule(ed); }), 100),

  // The View

  activateView() {
    this.onDidChange(c => this.updateView(c));

    this.dom = document.createElement('span');
    this.dom.classList.add('julia', 'inline-block');

    this.mainView = document.createElement('a');
    this.dividerView = document.createElement('span');
    this.subView = document.createElement('span');

    for (let x of [this.mainView, this.dividerView, this.subView]) { this.dom.appendChild(x); }

    this.mainView.onclick = () => {
      return atom.commands.dispatch(atom.views.getView(atom.workspace.getActivePaneItem()),
                             'julia-client:set-working-module');
    };

    atom.tooltips.add(this.dom,
      {title: () => `Currently working in module ${this.current()}`});

    // @NOTE: Grammar selector has `priority` 10 and thus set the it to a bit lower
    //        than that to avoid collision that may cause unexpected result.
    this.tile = this.statusBar.addRightTile({item: this.dom, priority: 5});
    const disposable = new Disposable(() => {
      this.tile.destroy();
      return delete this.tile;
  });
    this.subs.add(disposable);
    return disposable;
  },

  updateView(m) {
    if (this.tile == null) { return; }
    if ((m == null)) {
      return this.dom.style.display = 'none';
    } else {
      let view;
      const {main, sub, inactive, subInactive} = m;
      if (main === this.follow) {
        return this.updateView(this.lastEditorModule);
      }
      this.dom.style.display = '';
      this.mainView.innerText = main || 'Main';
      if (sub) {
        this.subView.innerText = sub;
        this.dividerView.innerText = '/';
      } else {
        for (view of [this.subView, this.dividerView]) { view.innerText = ''; }
      }
      if (inactive) {
        return this.dom.classList.add('fade');
      } else {
        this.dom.classList.remove('fade');
        return (() => {
          const result = [];
          for (view of [this.subView, this.dividerView]) {
            if (subInactive) {
              result.push(view.classList.add('fade'));
            } else {
              result.push(view.classList.remove('fade'));
            }
          }
          return result;
        })();
      }
    }
  },

  consumeStatusBar(bar) {
    this.statusBar = bar;
    const disposable = this.activateView();
    this.updateView(this._current);
    return disposable;
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}