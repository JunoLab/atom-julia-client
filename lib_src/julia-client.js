/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let JuliaClient;
import etch from 'etch';
import commands from './package/commands';
import config from './package/config';
import menu from './package/menu';
import settings from './package/settings';
import toolbar from './package/toolbar';
import semver from 'semver';

// TODO: Update me when tagging a new relase:
const INK_VERSION_COMPAT  = "^0.12.3";

const INK_LINK            = '[`ink`](https://github.com/JunoLab/atom-ink)';
const LANGUAGE_JULIA_LINK = '[`language-julia`](https://github.com/JuliaEditorSupport/atom-language-julia)';

export default JuliaClient = {
  misc:       require('./misc'),
  ui:         require('./ui'),
  connection: require('./connection'),
  runtime:    require('./runtime'),

  activate(state) {
    etch.setScheduler(atom.views);
    process.env['TERM'] = 'xterm-256color';
    commands.activate(this);
    for (let x of [menu, this.connection, this.runtime]) { x.activate(); }
    this.ui.activate(this.connection.client);

    return this.requireDeps(() => {
      settings.updateSettings();

      if (atom.config.get('julia-client.firstBoot')) {
        return this.ui.layout.queryDefaultLayout();
      } else {
        if (atom.config.get('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp')) {
          return setTimeout((() => this.ui.layout.restoreDefaultLayout()), 150);
        }
      }
    });
  },

  requireDeps(fn) {
    const isLoaded = atom.packages.isPackageLoaded("ink") && atom.packages.isPackageLoaded("language-julia");

    if (isLoaded) {
      return fn();
    } else {
      return require('atom-package-deps').install('julia-client')
        .then(() => this.enableDeps(fn))
        .catch(function(err) {
          console.error(err);
          return atom.notifications.addError('Installing Juno\'s dependencies failed.', {
            description:
              `\
Juno requires the packages ${INK_LINK} and ${LANGUAGE_JULIA_LINK} to run.
Please install them manually via \`File -> Settings -> Packages\`,
or open a terminal and run

    apm install ink
    apm install language-julia

and then restart Atom.\
`,
            dismissable: true
          }
          );
      });
    }
  },

  enableDeps(fn) {
    const isEnabled = atom.packages.isPackageLoaded("ink") && atom.packages.isPackageLoaded("language-julia");

    if (isEnabled) {
      return fn();
    } else {
      atom.packages.enablePackage('ink');
      atom.packages.enablePackage('language-julia');

      if (atom.packages.isPackageLoaded("ink") && atom.packages.isPackageLoaded("language-julia")) {
        atom.notifications.addSuccess("Automatically enabled Juno's dependencies.", {
          description:
            `\
Juno requires the ${INK_LINK} and ${LANGUAGE_JULIA_LINK} packages.
We've automatically enabled them for you.\
`,
          dismissable: true
        }
        );

        const inkVersion = atom.packages.loadedPackages["ink"].metadata.version;
        if (!atom.devMode && !semver.satisfies(inkVersion, INK_VERSION_COMPAT)) {
          atom.notifications.addWarning("Potentially incompatible `ink` version detected.", {
            description:
              `\
Please make sure to upgrade ${INK_LINK} to a version compatible with \`${INK_VERSION_COMPAT}\`.
The currently installed version is \`${inkVersion}\`.

If you cannot install an appropriate version via via \`File -> Settings -> Packages\`,
open a terminal and run

    apm install ink@x.y.z

where \`x.y.z\` is satisfies \`${INK_VERSION_COMPAT}\`.\
`,
            dismissable: true
          }
          );
        }

        return fn();
      } else {
        return atom.notifications.addError("Failed to enable Juno's dependencies.", {
          description:
            `\
Juno requires the ${INK_LINK} and ${LANGUAGE_JULIA_LINK} packages.
Please install them manually via \`File -> Settings -> Packages\`,
or open a terminal and run

    apm install ink
    apm install language-julia

and then restart Atom.\
`,
          dismissable: true
        }
        );
      }
    }
  },

  config,

  deactivate() {
    return [commands, menu, toolbar, this.connection, this.runtime, this.ui].map((x) => x.deactivate());
  },

  consumeInk(ink) {
    commands.ink = ink;
    return [this.connection, this.runtime, this.ui].map((x) => x.consumeInk(ink));
  },

  consumeStatusBar(bar) { return this.runtime.consumeStatusBar(bar); },

  consumeToolBar(bar) { return toolbar.consumeToolBar(bar); },

  consumeGetServerConfig(conf) { return this.connection.consumeGetServerConfig(conf); },

  consumeGetServerName(name) { return this.connection.consumeGetServerName(name); },

  consumeDatatip(datatipService) { return this.runtime.consumeDatatip(datatipService); },

  provideClient() { return this.connection.client; },

  provideAutoComplete() { return this.runtime.provideAutoComplete(); },

  provideHyperclick() { return this.runtime.provideHyperclick(); },

  handleURI(parsedURI) { return this.runtime.handleURI(parsedURI); }
};
