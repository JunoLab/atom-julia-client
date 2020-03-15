/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import client from './client';
import tcp from './process/tcp';

export default {
  activate() {

    client.handleBasic('install', () => {
      if (this.note != null) {
        this.note.dismiss();
      }
      return atom.notifications.addError("Error installing Atom.jl package", {
        description:
          `\
Go to the \`Packages -> Juno -> Open REPL\` menu and
run \`Pkg.add("Atom")\` in Julia, then try again.
If you still see an issue, please report it to:

https://discourse.julialang.org/\
`,
        dismissable: true
      }
      );
    });

    client.handleBasic('load', () => {
      if (this.note != null) {
        this.note.dismiss();
      }
      return atom.notifications.addError("Error loading Atom.jl package", {
        description:
          `\
Go to the \`Packages -> Juno -> Open REPL\` menu and
run \`Pkg.update()\` in Julia, then try again.
If you still see an issue, please report it to:

https://discourse.julialang.org/\
`,
        dismissable: true
      }
      );
    });

    client.handleBasic('installing', () => {
      if (this.note != null) {
        this.note.dismiss();
      }
      this.note = atom.notifications.addInfo("Installing Julia packages...", {
        description:
          `\
Julia's first run will take a couple of minutes.
See the REPL below for progress.\
`,
        dismissable: true
      }
      );
      return this.openConsole();
    });

    client.handleBasic('precompiling', () => {
      if (this.note != null) {
        this.note.dismiss();
      }
      this.note = atom.notifications.addInfo("Compiling Julia packages...", {
        description:
          `\
Julia's first run will take a couple of minutes.
See the REPL below for progress.\
`,
        dismissable: true
      }
      );
      return this.openConsole();
    });

    return client.handle({welcome: () => {
      if (this.note != null) {
        this.note.dismiss();
      }
      atom.notifications.addSuccess("Welcome to Juno!", {
        description:
          `\
Success! Juno is set up and ready to roll.
Try entering \`2+2\` in the REPL below.\
`,
        dismissable: true
      }
      );
      return this.openConsole();
    }
    });
  },

  openConsole() {
    return atom.commands.dispatch(atom.views.getView(atom.workspace),
      'julia-client:open-REPL');
  },

  jlNotFound(path, details = '') {
    return atom.notifications.addError("Julia could not be started.", {
      description:
        `\
We tried to launch Julia from: \`${path}\`
This path can be changed in the settings.\
`,
      detail: details,
      dismissable: true
    }
    );
  },

  connectExternal() {
    return tcp.listen().then(function(port) {
      const code = `using Atom; using Juno; Juno.connect(${port})`;
      const msg = atom.notifications.addInfo("Connect an external process", {
        description:
          `\
To connect a Julia process running in the terminal, run the command:

    ${code}\
`,
        dismissable: true,
        buttons: [{text: 'Copy', onDidClick() { return atom.clipboard.write(code); }}]
      });
      return client.onceAttached(function() {
        if (!msg.isDismissed()) {
          msg.dismiss();
        }
        return atom.notifications.addSuccess("Julia is connected.");
      });
    });
  }
};
