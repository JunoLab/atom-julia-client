'use babel'

import etch from 'etch';
import commands from './package/commands';
import config from './package/config';
import menu from './package/menu';
import * as settings from './package/settings';
import * as release from './package/release-note';
import toolbar from './package/toolbar';

// TODO: Update me when tagging a new relase (and release note)
const INK_VERSION_COMPAT = "^0.12.4";
const LATEST_RELEASE_NOTE_VERSION = "0.12.5";

const INK_LINK = '[`ink`](https://github.com/JunoLab/atom-ink)';
const LANGUAGE_JULIA_LINK = '[`language-julia`](https://github.com/JuliaEditorSupport/atom-language-julia)';

import * as misc from './misc'
import * as ui from './ui'
import * as connection from './connection'
import * as runtime from './runtime'

const JuliaClient = {
  // TODO remove these from the export default and export them directly (prevents expensive copy)
  // TODO don't use this.message use message directly (prevents expensive copy)
  misc: misc,
  ui: ui,
  connection: connection,
  runtime: runtime,

  activate(state) {
    etch.setScheduler(atom.views);
    process.env['TERM'] = 'xterm-256color';
    commands.activate(this);
    for (let x of [menu, this.connection, this.runtime]) {
      x.activate();
    }
    this.ui.activate(this.connection.client);

    this.requireDeps(() => {
      settings.updateSettings();

      if (atom.config.get('julia-client.firstBoot')) {
        this.ui.layout.queryDefaultLayout();
      } else {
        if (atom.config.get('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp')) {
          setTimeout((() => this.ui.layout.restoreDefaultLayout()), 150);
        }
      }
    });
  },

  requireDeps(fn) {
    const isLoaded = atom.packages.isPackageLoaded("ink") && atom.packages.isPackageLoaded("language-julia");

    if (isLoaded) {
      fn();
    } else {
      require('atom-package-deps').install('julia-client')
        .then(() => this.enableDeps(fn))
        .catch(function (err) {
          console.error(err);
          atom.notifications.addError('Installing Juno\'s dependencies failed.', {
              description:
                `Juno requires the packages ${INK_LINK} and ${LANGUAGE_JULIA_LINK} to run.
                 Please install them manually via \`File -> Settings -> Packages\`,
                 or open a terminal and run
                 
                     apm install ink
                     apm install language-julia
                 
                 and then restart Atom.`,
              dismissable: true
            }
          );
        });
    }
  },

  enableDeps(fn) {
    const isEnabled = atom.packages.isPackageLoaded("ink") && atom.packages.isPackageLoaded("language-julia");

    if (isEnabled) {
      fn();
    } else {
      atom.packages.enablePackage('ink');
      atom.packages.enablePackage('language-julia');

      if (atom.packages.isPackageLoaded("ink") && atom.packages.isPackageLoaded("language-julia")) {
        atom.notifications.addSuccess("Automatically enabled Juno's dependencies.", {
            description:
              `Juno requires the ${INK_LINK} and ${LANGUAGE_JULIA_LINK} packages.
              We've automatically enabled them for you.`,
            dismissable: true
          }
        );

        const inkVersion = atom.packages.loadedPackages["ink"].metadata.version;
        const semverSatisfies = require('semver/functions/satisfies');
        if (!atom.devMode && !semverSatisfies(inkVersion, INK_VERSION_COMPAT)) {
          atom.notifications.addWarning("Potentially incompatible `ink` version detected.", {
              description:
                `Please make sure to upgrade ${INK_LINK} to a version compatible with \`${INK_VERSION_COMPAT}\`.
                The currently installed version is \`${inkVersion}\`.
                
                If you cannot install an appropriate version via via \`File -> Settings -> Packages\`,
                open a terminal and run
                
                    apm install ink@x.y.z
                
                where \`x.y.z\` is satisfies \`${INK_VERSION_COMPAT}\`.`,
              dismissable: true
            }
          );
        }

        fn();
      } else {
        atom.notifications.addError("Failed to enable Juno's dependencies.", {
            description:
              `Juno requires the ${INK_LINK} and ${LANGUAGE_JULIA_LINK} packages.
              Please install them manually via \`File -> Settings -> Packages\`,
              or open a terminal and run
              
                  apm install ink
                  apm install language-julia
              
              and then restart Atom.`,
            dismissable: true
          }
        );
      }
    }
  },

  config,

  deactivate() {
    [commands, menu, toolbar, release, this.connection, this.runtime, this.ui].map((x) => x.deactivate());
  },

  consumeInk(ink) {
    commands.ink = ink;
    for (let x of [this.connection, this.runtime, this.ui]) {
      x.consumeInk(ink);
    }
    try {
      const v = atom.config.get('julia-client.currentVersion');
      if (v !== LATEST_RELEASE_NOTE_VERSION) {
        release.activate(ink, LATEST_RELEASE_NOTE_VERSION);
      } else {
        release.activate(ink);
      }
    } catch (err) {
      console.log(err);
    } finally {
      atom.config.set('julia-client.currentVersion', LATEST_RELEASE_NOTE_VERSION);
    }
  },

  consumeStatusBar(bar) {
    this.runtime.consumeStatusBar(bar);
  },

  consumeToolBar(bar) {
    toolbar.consumeToolBar(bar);
  },

  consumeGetServerConfig(conf) {
    this.connection.consumeGetServerConfig(conf);
  },

  consumeGetServerName(name) {
    this.connection.consumeGetServerName(name);
  },

  consumeDatatip(datatipService) {
    this.runtime.consumeDatatip(datatipService);
  },

  provideClient() {
    return this.connection.client;
  },

  provideAutoComplete() {
    return this.runtime.provideAutoComplete();
  },

  provideHyperclick() {
    return this.runtime.provideHyperclick();
  },

  handleURI(parsedURI) {
    this.runtime.handleURI(parsedURI);
  }
};

export default JuliaClient;
