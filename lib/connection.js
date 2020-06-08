'use babel'
import { time } from './misc';
import externalTerminal from './connection/terminal';

// TODO use babel to export ... from ...
import IPC from './connection/ipc'
import messages from './connection/messages'
import client from './connection/client'
import local from './connection/local'
import terminal from './connection/terminal'

export default {
  // TODO remove these from the export default and export them directly (prevents expensive copy)
  // TODO don't use this.message use message directly (prevents expensive copy)
  IPC:      IPC,
  messages: messages,
  client:   client,
  local:    local,
  terminal: terminal,

  activate() {
    this.messages.activate();
    this.client.activate();
    this.client.boot = () => this.boot();
    this.local.activate();
    this.booting = false;
  },

  deactivate() {
    this.client.deactivate();
  },

  consumeInk(ink) {
    this.IPC.consumeInk(ink);
    this.ink = ink;
  },

  consumeGetServerConfig(getconf) {
    this.local.consumeGetServerConfig(getconf);
  },

  consumeGetServerName(name) {
    this.local.consumeGetServerName(name);
  },

  _boot(provider) {
    if (!this.client.isActive() && !this.booting) {
      this.booting = true;
      this.client.setBootMode(provider);

      let p;
      if (provider === 'External Terminal') {
        p = externalTerminal.connectedRepl();
      } else {
        p = this.local.start(provider);
      }

      if (this.ink) {
        this.ink.Opener.allowRemoteFiles(provider === 'Remote');
      }
      p.then(() => {
        this.booting = false;
      });
      p.catch(() => {
        this.booting = false;
      });
      return time("Julia Boot", this.client.import('ping')());
    }
  },

  bootRemote() {
    return this._boot('Remote');
  },

  boot() {
    return this._boot(atom.config.get('julia-client.juliaOptions.bootMode'));
  }
};
