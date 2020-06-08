'use babel'
import { CompositeDisposable, Disposable } from 'atom';

// TODO use babel to export ... from ...
import modules from './runtime/modules'
import * as environments from './runtime/environments'
import evaluation from './runtime/evaluation'
import * as console from './runtime/console'
import completions from './runtime/completions'
import workspace from './runtime/workspace'
import plots from './runtime/plots'
import * as frontend from './runtime/frontend'
import * as debug from './runtime/debugger'
import * as profiler from './runtime/profiler'
import * as outline from './runtime/outline'
import * as linter from './runtime/linter'
import * as packages from './runtime/packages'
import debuginfo from './runtime/debuginfo'
import * as formatter from './runtime/formatter'
import goto from './runtime/goto'
import handleURI from "./runtime/urihandler";


export default {
  // TODO remove these from the export default and export them directly (prevents expensive copy)
  // TODO don't use this.message use message directly (prevents expensive copy)
  modules:      modules,
  environments: environments,
  evaluation:   evaluation,
  console:      console,
  completions:  completions,
  workspace:    workspace,
  plots:        plots,
  frontend:     frontend,
  debugger:     debug,
  profiler:     profiler,
  outline:      outline,
  linter:       linter,
  packages:     packages,
  debuginfo:    debuginfo,
  formatter:    formatter,
  goto:         goto,

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

  handleURI: handleURI,
};
