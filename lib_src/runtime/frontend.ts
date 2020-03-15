/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {BrowserWindow} = require('electron').remote;
import vm from 'vm';
import { client } from '../connection';
import { selector, notifications } from '../ui';
import { colors } from '../misc';

export default {
  evalwith(obj, code) {
    return vm.runInThisContext(`(function(){return ${code}})`).call(obj);
  },

  windows: {},

  activate() {
    client.handle({select(items) { return selector.show(items); }});

    client.handle({input() { return selector.show([], {allowCustom: true}); }});

    client.handle({syntaxcolors(selectors) { return colors.getColors(selectors); }});

    client.handle({openFile: (file, line) => (this.ink != null ? this.ink.Opener.open(file, line, {
      pending: atom.config.get('core.allowPendingPaneItems')
    }) : undefined)
    });

    client.handle({versionwarning(msg) {
      return atom.notifications.addWarning("Outdated version of Atom.jl detected.", {
        description: msg,
        dismissable: true
      }
      );
    }
    });

    // Blink APIs

    client.handle({
      createWindow: opts => {
        const w = new BrowserWindow(opts);
        if (opts.url != null) {
          w.loadURL(opts.url);
        }
        w.setMenu(null);
        const wid = w.id;
        this.windows[wid] = w;
        w.on('close', () => delete this.windows[wid]);
        return wid;
      },

      withWin: (id, code) => {
        return this.evalwith(this.windows[id], code);
      },

      winActive: id => {
        return this.windows.hasOwnProperty(id);
      },

      notify(msg) {
        return notifications.show(msg, true);
      }
    });


    return client.onDetached(() => {
      return (() => {
        const result = [];
        for (let id in this.windows) {
          const win = this.windows[id];
          delete this.windows[id];
          result.push(win.close());
        }
        return result;
      })();
    });
  },

  deactivate() {
    return (() => {
      const result = [];
      for (let id in this.windows) {
        const win = this.windows[id];
        result.push(win.close());
      }
      return result;
    })();
  }
};
