/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import path from 'path';
import fs from 'fs';
import child_process from 'child_process';

export default {

  home(...p) {
    const key = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
    return path.join(process.env[key], ...Array.from(p));
  },

  juliaHome(...p) {
    return path.join((process.env.JULIA_HOME || this.home('.julia')), ...Array.from(p));
  },

  jlpath() {
    return this.expandHome(atom.config.get("julia-client.juliaPath"));
  },

  expandHome(p) {
    if (p.startsWith('~')) { return p.replace('~', this.home()); } else { return p; }
  },

  fullPath(path) {
    return new Promise(function(resolve, reject) {
      let proc;
      if (fs.existsSync(path)) { resolve(path); }

      if (process.platform === 'win32') {
        if (/[a-zA-Z]\:/.test(path)) {
          reject("Couldn't resolve path.");
          return;
        }
      }

      const which = process.platform === 'win32' ? 'where' : 'which';
      return proc = child_process.exec(`${which} \"${path}\"`, function(err, stdout, stderr) {
        if (err != null) { return reject(stderr); }
        const p = stdout.trim();
        if (fs.existsSync(p)) { return resolve(p); }
        return reject("Couldn't resolve path.");
      });
    });
  },

  getVersion(path = this.jlpath()) {
    return new Promise((resolve, reject) => {
      let proc;
      return proc = child_process.exec(`\"${path}\" --version`, (err, stdout, stderr) => {
        if (err != null) { return reject(stderr); }
        const res = stdout.match(/(\d+)\.(\d+)\.(\d+)/);
        if (res == null) { return reject("Couldn't resolve version."); }
        const [_, major, minor, patch] = Array.from(res);
        return resolve({major, minor, patch});
    });
  });
  },

  projectDir() {
    if (atom.config.get('julia-client.juliaOptions.persistWorkingDir')) {
      return new Promise(resolve => {
        const p = atom.config.get('julia-client.juliaOptions.workingDir');
        try {
          return fs.stat(p, (err, stats) => {
            if (err) {
              return resolve(this.atomProjectDir());
            } else {
              return resolve(p);
            }
          });
        } catch (error) {
          const err = error;
          return resolve(this.atomProjectDir());
        }
      });
    } else {
      return this.atomProjectDir();
    }
  },

  atomProjectDir() {
    const dirs = atom.workspace.project.getDirectories();
    const ws = process.env.HOME || process.env.USERPROFILE;
    if ((dirs.length === 0) || dirs[0].path.match('app.asar')) {
      return Promise.resolve(ws);
    }
    return new Promise(function(resolve) {
      // use the first open project folder (or its parent folder for files) if
      // it is valid
      try {
        return fs.stat(dirs[0].path, (err, stats) => {
          if (err != null) {
            resolve(ws);
            return;
          }

          if (stats.isFile()) {
            return resolve(path.dirname(dirs[0].path));
          } else {
            return resolve(dirs[0].path);
          }
        });
      } catch (error) {
        const err = error;
        return resolve(ws);
      }
    });
  },

  packageDir(...s) {
    const packageRoot = path.resolve(__dirname, '..', '..');
    return path.join(packageRoot, ...Array.from(s));
  },

  script(...s) { return this.packageDir('script', ...Array.from(s)); },

  getPathFromTreeView(el) {
    // invoked from tree-view context menu
    let pathEl = el.closest('[data-path]');
    if (!pathEl) {
      // invoked from command with focusing on tree-view
      const activeEl = el.querySelector('.tree-view .selected');
      if (activeEl) { pathEl = activeEl.querySelector('[data-path]'); }
    }
    if (pathEl) { return pathEl.dataset.path; }
    return null;
  },

  getDirPathFromTreeView(el) {
    // invoked from tree-view context menu
    let dirEl = el.closest('.directory');
    if (!dirEl) {
      // invoked from command with focusing on tree-view
      const activeEl = el.querySelector('.tree-view .selected');
      if (activeEl) { dirEl = activeEl.closest('.directory'); }
    }
    if (dirEl) {
      const pathEl = dirEl.querySelector('[data-path]');
      if (pathEl) { return pathEl.dataset.path; }
    }
    return null;
  },

  readCode(path) {
    return fs.readFileSync(path, 'utf-8');
  }
};
