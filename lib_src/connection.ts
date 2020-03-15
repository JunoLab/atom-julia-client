/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { time } from './misc';
import externalTerminal from './connection/terminal';

export default {
  IPC:      require('./connection/ipc'),
  messages: require('./connection/messages'),
  client:   require('./connection/client'),
  local:    require('./connection/local'),
  terminal: require('./connection/terminal'),

  activate() {
    this.messages.activate();
    this.client.activate();
    this.client.boot = () => this.boot();
    this.local.activate();
    return this.booting = false;
  },

  deactivate() {
    return this.client.deactivate();
  },

  consumeInk(ink) {
    this.IPC.consumeInk(ink);
    return this.ink = ink;
  },

  consumeGetServerConfig(getconf) {
    return this.local.consumeGetServerConfig(getconf);
  },

  consumeGetServerName(name) {
    return this.local.consumeGetServerName(name);
  },

  _boot(provider) {
    if (!this.client.isActive() && !this.booting) {
      let p;
      this.booting = true;
      this.client.setBootMode(provider);
      if (provider === 'External Terminal') {
        p = externalTerminal.connectedRepl();
      } else {
        p = this.local.start(provider);
      }

      if (this.ink != null) {
        this.ink.Opener.allowRemoteFiles(provider === 'Remote');
      }
      p.then(() => {
        return this.booting = false;
      });
      p.catch(() => {
        return this.booting = false;
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
