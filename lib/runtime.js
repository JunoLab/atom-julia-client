'use babel'
import { CompositeDisposable, Disposable } from 'atom';

export default {
  modules:      require('./runtime/modules'),
  environments: require('./runtime/environments'),
  evaluation:   require('./runtime/evaluation'),
  console:      require('./runtime/console'),
  completions:  require('./runtime/completions'),
  workspace:    require('./runtime/workspace'),
  plots:        require('./runtime/plots'),
  frontend:     require('./runtime/frontend'),
  debugger:     require('./runtime/debugger'),
  profiler:     require('./runtime/profiler'),
  outline:      require('./runtime/outline'),
  linter:       require('./runtime/linter'),
  packages:     require('./runtime/packages'),
  debuginfo:    require('./runtime/debuginfo'),
  formatter:    require('./runtime/formatter'),
  goto:         require('./runtime/goto'),

  activate() {
    this.subs = new CompositeDisposable();

    this.modules.activate();
    this.completions.activate();
    this.subs.add(atom.config.observe('julia-client.juliaOptions.formatOnSave', val => {
        if (val) {
          this.formatter.activate();
        } else {
          this.formatter.deactivate();
        }
      })
    );

    this.subs.add(new Disposable(() => {
        [this.modules, this.completions, this.formatter].map((mod) => mod.deactivate());
      })
    );
  },

  deactivate() {
    this.subs.dispose();
  },

  consumeInk(ink) {
    this.evaluation.ink = ink;
    for (let mod of [this.console, this.debugger, this.profiler, this.linter, this.goto, this.outline, this.frontend]) {
      mod.activate(ink);
    }
    for (let mod of [this.workspace, this.plots]) {
      mod.ink = ink;
      mod.activate();
    }

    this.subs.add(
      new Disposable(() => {
        for (let mod of [this.console, this.debugger, this.profiler, this.linter, this.goto, this.outline]) {
          mod.deactivate();
        }
      })
    );

    this.environments.consumeInk(ink);
  },

  provideAutoComplete() { return this.completions; },

  provideHyperclick() { return this.goto.provideHyperclick(); },

  consumeStatusBar(bar) {
    const m = this.modules.consumeStatusBar(bar);
    const e = this.environments.consumeStatusBar(bar);
    const d = new Disposable(() => {
      m.dispose();
      e.dispose();
    });
    this.subs.add(d);
    return d;
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
