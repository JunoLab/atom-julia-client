/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import shell from 'shell';
import cells from '../misc/cells';
import { CompositeDisposable } from 'atom';

export default {
  activate(juno) {
    const requireClient    = (a, f) => juno.connection.client.require(a, f);
    const disrequireClient = (a, f) => juno.connection.client.disrequire(a, f);
    const boot = () => juno.connection.boot();

    const cancelComplete = e => atom.commands.dispatch(e.currentTarget, 'autocomplete-plus:cancel');

    this.subs = new CompositeDisposable();

    // atom-text-editors with Julia scopes
    for (let scope of atom.config.get('julia-client.juliaSyntaxScopes')) {
      this.subs.add(atom.commands.add(`atom-text-editor[data-grammar='${scope.replace(/\./g, ' ')}']`, {
        'julia-client:run-block': event => {
          cancelComplete(event);
          return this.withInk(function() {
            boot();
            return juno.runtime.evaluation.eval();
          });
        },
        'julia-client:run-and-move': event => {
          return this.withInk(function() {
            boot();
            return juno.runtime.evaluation.eval({move: true});
          });
        },
        'julia-client:run-all': event => {
          cancelComplete(event);
          return this.withInk(function() {
            boot();
            return juno.runtime.evaluation.evalAll();
          });
        },
        'julia-client:run-cell': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.evaluation.eval({cell: true});
          });
        },
        'julia-client:run-cell-and-move': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.evaluation.eval({cell: true, move: true});
          });
        },
        'julia-client:select-block': () => {
          return juno.misc.blocks.select();
        },
        'julia-client:next-cell': () => {
          return cells.moveNext();
        },
        'julia-client:prev-cell': () => {
          return cells.movePrev();
        },
        'julia-client:goto-symbol': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.goto.gotoSymbol();
          });
        },
        'julia-client:show-documentation': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.evaluation.toggleDocs();
          });
        },
        // @NOTE: `'clear-workspace'` is now not handled by Atom.jl
        // 'julia-client:reset-workspace': =>
        //   requireClient 'reset the workspace', ->
        //     editor = atom.workspace.getActiveTextEditor()
        //     atom.commands.dispatch atom.views.getView(editor), 'inline-results:clear-all'
        //     juno.connection.client.import('clear-workspace')()
        'julia-client:send-to-stdin': e => {
          return requireClient(function() {
            const ed = e.currentTarget.getModel();
            let done = false;
            for (let s of ed.getSelections()) {
              if (!s.getText()) { continue; }
              done = true;
              juno.connection.client.stdin(s.getText());
            }
            if (!done) { return juno.connection.client.stdin(ed.getText()); }
          });
        },
        'julia-debug:run-block': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.debugger.debugBlock(false, false);
          });
        },
        'julia-debug:step-through-block': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.debugger.debugBlock(true, false);
          });
        },
        'julia-debug:run-cell': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.debugger.debugBlock(false, true);
          });
        },
        'julia-debug:step-through-cell': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.debugger.debugBlock(true, true);
          });
        },
        'julia-debug:toggle-breakpoint': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.debugger.togglebp();
          });
        },
        'julia-debug:toggle-conditional-breakpoint': () => {
          return this.withInk(function() {
            boot();
            return juno.runtime.debugger.togglebp(true);
          });
        }
      }
      )
      );
    }

    // atom-text-editor with Julia grammar scope
    this.subs.add(atom.commands.add('atom-text-editor[data-grammar="source julia"]', {
      'julia-client:format-code': () => {
        return this.withInk(function() {
          boot();
          return juno.runtime.formatter.formatCode();
        });
      }
    }
    )
    );

    // Where "module" matters
    this.subs.add(atom.commands.add(`atom-text-editor[data-grammar="source julia"], \
.julia-terminal, \
.ink-workspace`,
      {'julia-client:set-working-module'() { return juno.runtime.modules.chooseModule(); }})
    );

    // tree-view
    this.subs.add(atom.commands.add('.tree-view', {
      'julia-client:run-all': ev => {
        cancelComplete(ev);
        return this.withInk(function() {
          boot();
          return juno.runtime.evaluation.evalAll(ev.target);
        });
      },
      'julia-debug:run-file': ev => {
        return this.withInk(function() {
          boot();
          return juno.runtime.debugger.debugFile(false, ev.target);
        });
      },
      'julia-debug:step-through-file': ev => {
        return this.withInk(function() {
          boot();
          return juno.runtime.debugger.debugFile(true, ev.target);
        });
      }
    }
    )
    );

    // atom-work-space
    return this.subs.add(atom.commands.add('atom-workspace', {
      'julia-client:open-external-REPL'() { return juno.connection.terminal.repl(); },
      'julia-client:start-julia'() { return disrequireClient('boot Julia', () => boot()); },
      'julia-client:start-remote-julia-process'() { return disrequireClient('boot a remote Julia process', () => juno.connection.bootRemote()); },
      'julia-client:kill-julia'() { return juno.connection.client.kill(); },
      'julia-client:interrupt-julia': () => requireClient('interrupt Julia', () => juno.connection.client.interrupt()),
      'julia-client:disconnect-julia': () => requireClient('disconnect Julia', () => juno.connection.client.disconnect()),
      // 'julia-client:reset-julia-server': -> juno.connection.local.server.reset() # server mode not functional
      'julia-client:connect-external-process'() { return disrequireClient(() => juno.connection.messages.connectExternal()); },
      'julia-client:connect-terminal'() { return disrequireClient(() => juno.connection.terminal.connectedRepl()); },
      'julia-client:open-plot-pane': () => this.withInk(() => juno.runtime.plots.open()),
      'julia-client:open-outline-pane': () => this.withInk(() => juno.runtime.outline.open()),
      'julia-client:open-workspace': () => this.withInk(() => juno.runtime.workspace.open()),
      'julia-client:restore-default-layout'() { return juno.ui.layout.restoreDefaultLayout(); },
      'julia-client:close-juno-panes'() { return juno.ui.layout.closePromises(); },
      'julia-client:reset-default-layout-settings'() { return juno.ui.layout.resetDefaultLayoutSettings(); },
      'julia-client:settings'() { return atom.workspace.open('atom://config/packages/julia-client'); },

      'julia-debug:run-file': () => {
        return this.withInk(function() {
          boot();
          return juno.runtime.debugger.debugFile(false);
        });
      },
      'julia-debug:step-through-file': () => {
        return this.withInk(function() {
          boot();
          return juno.runtime.debugger.debugFile(true);
        });
      },
      'julia-debug:clear-all-breakpoints': () => juno.runtime.debugger.clearbps(),
      'julia-debug:step-to-next-line': ev => juno.runtime.debugger.nextline(ev),
      'julia-debug:step-to-selected-line': ev => juno.runtime.debugger.toselectedline(ev),
      'julia-debug:step-to-next-expression': ev => juno.runtime.debugger.stepexpr(ev),
      'julia-debug:step-into': ev => juno.runtime.debugger.stepin(ev),
      'julia-debug:stop-debugging': ev => juno.runtime.debugger.stop(ev),
      'julia-debug:step-out': ev => juno.runtime.debugger.finish(ev),
      'julia-debug:continue': ev => juno.runtime.debugger.continueForward(ev),
      'julia-debug:open-debugger-pane': () => juno.runtime.debugger.open(),

      'julia:new-julia-file': () => {
        return atom.workspace.open().then(ed => {
          const gr = atom.grammars.grammarForScopeName('source.julia');
          if (gr) { return ed.setGrammar(gr); }
        });
      },
      'julia:open-julia-startup-file'() { return atom.workspace.open(juno.misc.paths.home('.julia', 'config', 'startup.jl')); },
      'julia:open-juno-startup-file'() { return atom.workspace.open(juno.misc.paths.home('.julia', 'config', 'juno_startup.jl')); },
      'julia:open-julia-home'() { return shell.openItem(juno.misc.paths.juliaHome()); },
      'julia:open-package-in-new-window'() { return requireClient('get packages', () => juno.runtime.packages.openPackage()); },
      'julia:open-package-as-project-folder'() { return requireClient('get packages', () => juno.runtime.packages.openPackage(false)); },
      'julia:get-help'() { return shell.openExternal('http://discourse.julialang.org'); },
      'julia-client:debug-info': () => {
        boot();
        return juno.runtime.debuginfo();
      },

      'julia-client:work-in-current-folder'(ev) {
        return requireClient('change working folder', () => juno.runtime.evaluation.cdHere(ev.target));
      },
      'julia-client:work-in-project-folder'() {
        return requireClient('change working folder', () => juno.runtime.evaluation.cdProject());
      },
      'julia-client:work-in-home-folder'() {
        return requireClient('change working folder', () => juno.runtime.evaluation.cdHome());
      },
      'julia-client:select-working-folder'() {
        return requireClient('change working folder', () => juno.runtime.evaluation.cdSelect());
      },
      'julia-client:activate-environment-in-current-folder'(ev) {
        return requireClient('activate an environment', () => juno.runtime.evaluation.activateProject(ev.target));
      },
      'julia-client:activate-environment-in-parent-folder'(ev) {
        return requireClient('activate an environment', () => juno.runtime.evaluation.activateParentProject(ev.target));
      },
      'julia-client:activate-default-environment'(ev) {
        return requireClient('activate an environment', () => juno.runtime.evaluation.activateDefaultProject());
      }
    }
    )
    );
  },

  deactivate() {
    return this.subs.dispose();
  },

  withInk(f, err) {
    if (this.ink != null) {
      return f();
    } else if (err) {
      return atom.notifications.addError('Please install the Ink package.', {
        detail: `Julia Client requires the Ink package to run. \
You can install it via \`File -> Settings -> Install\`.`,
        dismissable: true
      }
      );
    } else {
      return setTimeout((() => this.withInk(f, true)), 100);
    }
  }
};
