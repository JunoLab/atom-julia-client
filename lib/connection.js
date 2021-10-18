'use babel'
import { time } from './misc';
import externalTerminal from './connection/terminal';

import IPC from './connection/ipc'
import messages from './connection/messages'
import client from './connection/client'
import local from './connection/local'
import terminal from './connection/terminal'

let booting = false;
let ink;

export function activate() {
    messages.activate();
    client.activate();
    client.boot = () => boot();
    local.activate();
    booting = false;
}

export function deactivate() {
    client.deactivate();
}

export function consumeInk(ink_in) {
    ink = ink_in;
    IPC.consumeInk(ink);
}

export function consumeGetServerConfig(getconf) {
    local.consumeGetServerConfig(getconf);
}

export function consumeGetServerName(name) {
    local.consumeGetServerName(name);
}

export function _boot(provider) {
    if (!client.isActive() && !booting) {
      booting = true;
      client.setBootMode(provider);

      let p;
      if (provider === 'External Terminal') {
        p = externalTerminal.connectedRepl();
      } else {
        p = local.start(provider);
      }

      if (ink) {
        ink.Opener.allowRemoteFiles(provider === 'Remote');
      }
      p.then(() => {
        booting = false;
      });
      p.catch(() => {
        booting = false;
      });
      return time("Julia Boot", client.import('ping')());
    }
}

export function bootRemote() {
    return _boot('Remote');
}

export function boot() {
    return _boot(atom.config.get('julia-client.juliaOptions.bootMode'));
}

exports.IPC = IPC
exports.messages = messages
exports.client = client
exports.local = local
exports.terminal = terminal
