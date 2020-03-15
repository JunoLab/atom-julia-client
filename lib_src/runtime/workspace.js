/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { CompositeDisposable } from 'atom';
import { views } from '../ui';
import { client } from '../connection';
import modules from './modules';

const { workspace, gotosymbol: gotoSymbol, clearLazy } = client.import({rpc: ['workspace', 'gotosymbol'], msg: 'clearLazy'});

export default {
  activate() {
    this.create();

    client.onDetached(() => {
      this.ws.setItems([]);
      return this.lazyTrees = [];
  });

    return atom.config.observe('julia-client.uiOptions.layouts.workspace.defaultLocation', defaultLocation => {
      return this.ws.setDefaultLocation(defaultLocation);
    });
  },

  lazyTrees: [],

  update() {
    if (!client.isActive() || !this.ws.currentPane()) { return this.ws.setItems([]); }
    clearLazy(this.lazyTrees);
    const registerLazy = id => this.lazyTrees.push(id);
    const mod = this.mod === modules.follow ? modules.current() : (this.mod || 'Main');
    const p = workspace(mod).then(ws => {
      for (let {items} of ws) {
        for (let item of items) {
          item.value = views.render(item.value, {registerLazy});
          item.onClick = this.onClick(item.name);
        }
      }
      return this.ws.setItems(ws);
    });
    return p.catch(function(err) {
      if (err !== 'disconnected') {
        console.error('Error refreshing workspace');
        return console.error(err);
      }
    });
  },

  onClick(name) {
    return () => {
      const mod = this.mod === modules.follow ? modules.current() : (this.mod || 'Main');
      return gotoSymbol({
        word: name,
        mod}).then(symbols => {
        if (symbols.error) { return; }
        return this.ink.goto.goto(symbols,
          {pending: atom.config.get('core.allowPendingPaneItems')});
      });
    };
  },

  create() {
    this.ws = this.ink.Workspace.fromId('julia');
    this.ws.setModule = mod => { return this.mod = mod; };
    this.ws.refresh = () => this.update();
    return this.ws.refreshModule = () => {
      const m = modules.chooseModule();
      if ((m != null ? m.then : undefined) != null) {
        return m.then(() => this.update());
      }
    };
  },

  open() {
    return this.ws.open({
      split: atom.config.get('julia-client.uiOptions.layouts.workspace.split')});
  },

  close() {
    return this.ws.close();
  }
};
