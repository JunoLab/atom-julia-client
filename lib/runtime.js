'use babel'
import { CompositeDisposable, Disposable } from 'atom';

// TODO use babel to export ... from ...
import modules from './runtime/modules'
import * as environments from './runtime/environments'
import evaluation from './runtime/evaluation'
import * as repl from './runtime/console'   // console is a is a reserved keyword
import completions from './runtime/completions'
import workspace from './runtime/workspace'
import plots from './runtime/plots'
import * as frontend from './runtime/frontend'
import * as debug from './runtime/debugger'  // debugger is a is a reserved keyword
import * as profiler from './runtime/profiler'
import * as outline from './runtime/outline'
import * as linter from './runtime/linter'
import * as packages from './runtime/packages'
import debuginfo from './runtime/debuginfo'
import * as formatter from './runtime/formatter'
import goto from './runtime/goto'
import handleURI from "./runtime/urihandler";

let subs;

export function activate() {
    subs = new CompositeDisposable();

    modules.activate();
    completions.activate();
    subs.add(atom.config.observe('julia-client.juliaOptions.formatOnSave', val => {
        if (val) {
          formatter.activate();
        } else {
          formatter.deactivate();
        }
      })
    );

    subs.add(new Disposable(() => {
        [modules, completions, formatter].map((mod) => mod.deactivate());
      })
    );
}

export function deactivate() {
    subs.dispose();
}

export function consumeInk(ink) {
    evaluation.ink = ink;
    for (let mod of [repl, debug, profiler, linter, goto, outline, frontend]) {
      mod.activate(ink);
    }
    for (let mod of [workspace, plots]) {
      mod.ink = ink;
      mod.activate();
    }

    subs.add(
      new Disposable(() => {
        for (let mod of [repl, debug, profiler, linter, goto, outline]) {
          mod.deactivate();
        }
      })
    );

    environments.consumeInk(ink);
}

export function provideAutoComplete() { return completions; }

export function provideHyperclick() { return goto.provideHyperclick(); }

export function consumeStatusBar(bar) {
    const m = modules.consumeStatusBar(bar);
    const e = environments.consumeStatusBar(bar);
    const d = new Disposable(() => {
      m.dispose();
      e.dispose();
    });
    subs.add(d);
    return d;
}

export function consumeDatatip(datatipService) {
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
    subs.add(datatipDisposable);
    return datatipDisposable;
}

exports.modules = modules
exports.environments = environments
exports.evaluation = evaluation
exports.repl = repl
exports.completions = completions
exports.workspace = workspace
exports.plots = plots
exports.frontend = frontend
exports.debug = debug
exports.profiler = profiler
exports.outline = outline
exports.linter = linter
exports.packages = packages
exports.debuginfo = debuginfo
exports.formatter = formatter
exports.goto = goto
exports.handleURI = handleURI
