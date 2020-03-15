/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { CompositeDisposable, Disposable } from 'atom';

export default {
  modules:    require('./runtime/modules'),
  evaluation: require('./runtime/evaluation'),
  console:    require('./runtime/console'),
  workspace:  require('./runtime/workspace'),
  plots:      require('./runtime/plots'),
  frontend:   require('./runtime/frontend'),
  debugger:   require('./runtime/debugger'),
  profiler:   require('./runtime/profiler'),
  outline:    require('./runtime/outline'),
  linter:     require('./runtime/linter'),
  packages:   require('./runtime/packages'),
  debuginfo:  require('./runtime/debuginfo'),
  formatter:  require('./runtime/formatter'),
  goto:       require('./runtime/goto'),

  activate() {
    this.subs = new CompositeDisposable();
    this.modules.activate();
    this.frontend.activate();

    this.subs.add(atom.config.observe('julia-client.juliaOptions.formatOnSave', val => {
      if (val) {
        return this.formatter.activate();
      } else {
        return this.formatter.deactivate();
      }
    })
    );

    return this.subs.add(new Disposable(() => {
      return [this.modules, this.frontend, this.formatter].map((mod) => mod.deactivate());
  })
    );
  },

  deactivate() {
    return this.subs.dispose();
  },

  consumeInk(ink) {
    let mod;
    this.evaluation.ink = ink;
    this.frontend.ink = ink;
    for (mod of [this.console, this.debugger, this.profiler, this.linter, this.goto, this.outline]) {
      mod.activate(ink);
    }
    for (mod of [this.workspace, this.plots]) {
      mod.ink = ink;
      mod.activate();
    }
    return this.subs.add(new Disposable(() => {
      return (() => {
        const result = [];
        for (mod of [this.console, this.debugger, this.profiler, this.linter, this.goto, this.outline]) {           result.push(mod.deactivate());
        }
        return result;
      })();
  })
    );
  },

  provideAutoComplete() {
    return require('./runtime/completions');
  },

  provideHyperclick() { return this.goto.provideHyperclick(); },

  consumeStatusBar(bar) {
    return this.modules.consumeStatusBar(bar);
  },

  consumeDatatip(datatipService) {
    const datatipProvider = require('./runtime/datatip');
    // @NOTE: Check if the service is passed by Atom-IDE-UI's datatip service:
    //          currently atom-ide-datatip can't render code snippets correctly.
    if (datatipService.constructor.name === 'DatatipManager') {
      datatipProvider.useAtomIDEUI = true;
    } else {
      // @NOTE: Overwrite the weird default config settings of atom-ide-datatip
      atom.config.set('atom-ide-datatip', {
        showDataTipOnCursorMove: false,
        showDataTipOnMouseMove: true
      }
      );
    }
    const datatipDisposable = datatipService.addProvider(datatipProvider);
    this.subs.add(datatipDisposable);
    return datatipDisposable;
  },

  handleURI: require('./runtime/urihandler')
};
