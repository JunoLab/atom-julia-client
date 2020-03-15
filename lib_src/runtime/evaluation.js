/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// TODO: this is very horrible, refactor
import path from 'path';

const {dialog, BrowserWindow} = require('electron').remote;

import { client } from '../connection';
import { notifications, views, selector, docpane } from '../ui';
import { paths, blocks, cells, words, weave } from '../misc';
import { processLinks } from '../ui/docs';
import workspace from './workspace';
import modules from './modules';
const {
  eval: evaluate, evalall, evalshow, module: getmodule,
  cd, clearLazy, activateProject, activateParentProject, activateDefaultProject
} = client.import({
  rpc: ['eval', 'evalall', 'evalshow', 'module'],
  msg: ['cd', 'clearLazy', 'activateProject', 'activateParentProject', 'activateDefaultProject']});
const searchDoc = client.import('docs');

export default {
  _currentContext() {
    const editor = atom.workspace.getActiveTextEditor();
    const mod = modules.current() || 'Main';
    const edpath = client.editorPath(editor) || ('untitled-' + editor.getBuffer().id);
    return {editor, mod, edpath};
  },

  _showError(r, lines) {
    if (this.errorLines != null) {
      this.errorLines.lights.destroy();
    }
    const lights = this.ink.highlights.errorLines(((() => {
      const result = [];
      for (let {file, line} of lines) {         result.push({file, line: line-1});
      }
      return result;
    })()));
    this.errorLines = {r, lights};
    return r.onDidDestroy(() => {
      if ((this.errorLines != null ? this.errorLines.r : undefined) === r) { return this.errorLines.lights.destroy(); }
    });
  },

  eval({move, cell}={}) {
    const {editor, mod, edpath} = this._currentContext();
    const codeSelector = (cell != null) ? cells : blocks;
    // global options
    const resultsDisplayMode = atom.config.get('julia-client.uiOptions.resultsDisplayMode');
    const errorInRepl = atom.config.get('julia-client.uiOptions.errorInRepl');
    const scrollToResult = atom.config.get('julia-client.uiOptions.scrollToResult');

    return Promise.all(codeSelector.get(editor).map(({range, line, text, selection}) => {
      if (move) { codeSelector.moveNext(editor, selection, range); }
      const [start] = Array.from(range[0]), [end] = Array.from(range[1]);
      this.ink.highlight(editor, start, end);
      let rtype = resultsDisplayMode;
      if (cell && !(rtype === 'console')) {
          rtype = 'block';
        }
      if (rtype === 'console') {
        evalshow({text, line: line+1, mod, path: edpath});
        notifications.show("Evaluation Finished");
        return workspace.update();
      } else {
        let r = null;
        setTimeout((() => r != null ? r : (r = new this.ink.Result(editor, [start, end], {type: rtype, scope: 'julia', goto: scrollToResult}))), 0.1);
        return evaluate({text, line: line+1, mod, path: edpath, errorInRepl})
          .catch(() => r != null ? r.destroy() : undefined)
          .then(result => {
            if ((result == null)) {
              if (r != null) {
                r.destroy();
              }
              console.error('Error: Something went wrong while evaluating.');
              return;
            }
            const error = result.type === 'error';
            const view = error ? result.view : result;
            if ((r == null) || r.isDestroyed) { r = new this.ink.Result(editor, [start, end], {type: rtype, scope: 'julia', goto: scrollToResult}); }
            const registerLazy = function(id) {
              r.onDidDestroy(client.withCurrent(() => clearLazy([id])));
              return editor.onDidDestroy(client.withCurrent(() => clearLazy(id)));
            };
            r.setContent(views.render(view, {registerLazy}), {error});
            if (error) {
              if (error) { atom.beep(); }
              this.ink.highlight(editor, start, end, 'error-line');
              if (result.highlights != null) {
                this._showError(r, result.highlights);
              }
            }
            notifications.show("Evaluation Finished");
            workspace.update();
            return result;
        });
      }
    })
    );
  },

  evalAll(el) {
    let code;
    if (el) {
      path = paths.getPathFromTreeView(el);
      if (!path) {
        return atom.notifications.addError('This file has no path.');
      }
      try {
        code = paths.readCode(path);
        const data = {
          path,
          code,
          row: 1,
          column: 1
        };
        return getmodule(data)
          .then(mod => {
            return evalall({
              path,
              module: modules.current(mod),
              code
            })
              .then(function(result) {
                notifications.show("Evaluation Finished");
                return workspace.update();}).catch(err => {
                return console.log(err);
            });
        }).catch(err => {
            return console.log(err);
        });

      } catch (error) {
        return atom.notifications.addError('Error happened', {
          detail: error,
          dismissable: true
        }
        );
      }
    } else {
      const {editor, mod, edpath} = this._currentContext();
      atom.commands.dispatch(atom.views.getView(editor), 'inline-results:clear-all');
      const [scope] = Array.from(editor.getRootScopeDescriptor().getScopesArray());
      const weaveScopes = ['source.weave.md', 'source.weave.latex'];
      const module = weaveScopes.includes(scope) ? mod : editor.juliaModule;
      code = weaveScopes.includes(scope) ? weave.getCode(editor) : editor.getText();
      return evalall({
        path: edpath,
        module,
        code
      })
        .then(function(result) {
          notifications.show("Evaluation Finished");
          return workspace.update();}).catch(err => {
          return console.log(err);
      });
    }
  },

  toggleDocs() {
    const { editor, mod, edpath } = this._currentContext();
    const bufferPosition = editor.getLastCursor().getBufferPosition();
    // get word without trailing dot accessors at the buffer position
    let { word, range } = words.getWordAndRange(editor, { bufferPosition });
    range = words.getWordRangeWithoutTrailingDots(word, range, bufferPosition);
    word = editor.getTextInBufferRange(range);

    if (!words.isValidWordToInspect(word)) { return; }
    return searchDoc({word, mod})
      .then(result => {
        if (result.error) { return; }
        const v = views.render(result);
        processLinks(v.getElementsByTagName('a'));
        if (atom.config.get('julia-client.uiOptions.docsDisplayMode') === 'inline') {
          const d = new this.ink.InlineDoc(editor, range, {
            content: v,
            highlight: true
          }
          );
          return d.view.classList.add('julia');
        } else {
          docpane.ensureVisible();
          return docpane.showDocument(v, []);
        }
    }).catch(err => {
        return console.log(err);
    });
  },

  // Working Directory

  _cd(dir) {
    if (atom.config.get('julia-client.juliaOptions.persistWorkingDir')) {
      atom.config.set('julia-client.juliaOptions.workingDir', dir);
    }
    return cd(dir);
  },

  cdHere(el) {
    const dir = this.currentDir(el);
    if (dir) {
      return this._cd(dir);
    }
  },

  activateProject(el) {
    const dir = this.currentDir(el);
    if (dir) {
      return activateProject(dir);
    }
  },

  activateParentProject(el) {
    const dir = this.currentDir(el);
    if (dir) {
      return activateParentProject(dir);
    }
  },

  activateDefaultProject() {
    return activateDefaultProject();
  },

  currentDir(el) {
    const dirPath = paths.getDirPathFromTreeView(el);
    if (dirPath) { return dirPath; }
    // invoked from normal command usage
    const file = client.editorPath(atom.workspace.getCenter().getActiveTextEditor());
    if (file) { return path.dirname(file); }
    atom.notifications.addError('This file has no path.');
    return null;
  },

  cdProject() {
    const dirs = atom.project.getPaths();
    if (dirs.length < 1) {
      return atom.notifications.addError('This project has no folders.');
    } else if (dirs.length === 1) {
      return this._cd(dirs[0]);
    } else {
      return selector.show(dirs)
        .then(dir => {
          if (dir == null) { return; }
          return this._cd(dir);
      }).catch(err => {
          return console.log(err);
      });
    }
  },

  cdHome() {
    return this._cd(paths.home());
  },

  cdSelect() {
    const opts = {properties: ['openDirectory']};
    return dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), opts, path => {
      if (path != null) { return this._cd(path[0]); }
  });
  }
};
