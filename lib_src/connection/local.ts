/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { paths } from '../misc';
import messages from './messages';
import client from './client';

const junorc = client.import('junorc', false);

const cycler = require('./process/cycler');
const ssh = require('./process/remote');
const basic = require('./process/basic');

export default {
  consumeGetServerConfig(getconf) {
    return ssh.consumeGetServerConfig(getconf);
  },

  consumeGetServerName(name) {
    return ssh.consumeGetServerName(name);
  },

  provider(p) {
    let bootMode = undefined;
    if (p != null) {
      bootMode = p;
    } else {
      bootMode = atom.config.get('julia-client.juliaOptions.bootMode');
    }
    switch (bootMode) {
      case 'Cycler': return cycler;
      case 'Remote': return ssh;
      case 'Basic':  return basic;
    }
  },

  activate() {
    if (process.platform === 'win32') {
      process.env.JULIA_EDITOR = `\"${process.execPath}\" ${atom.devMode ? '-d' : ''} -a`;
    } else {
      process.env.JULIA_EDITOR = `atom ${atom.devMode ? '-d' : ''} -a`;
    }

    return paths.getVersion()
      .then(() => {
        return __guardMethod__(this.provider(), 'start', o => o.start(paths.jlpath(), client.clargs()));
    }).catch(function() {});
  },

  monitor(proc) {
    client.emitter.emit('boot', proc);
    proc.ready = () => false;
    client.attach(proc);
    return proc;
  },

  connect(proc, sock) {
    proc.message = m => sock.write(JSON.stringify(m));
    client.readStream(sock);
    sock.on('end', function() {
      proc.kill();
      return client.detach();
    });
    sock.on('error', function() {
      proc.kill();
      return client.detach();
    });
    proc.ready = () => true;
    client.flush();
    return proc;
  },

  start(provider) {
    const [path, args] = Array.from([paths.jlpath(), client.clargs()]);
    let check = paths.getVersion();

    if (provider === 'Remote') {
      check = Promise.resolve();
    } else {
      check.catch(err => {
        return messages.jlNotFound(paths.jlpath(), err);
      });
    }

    const proc = check
      .then(() => this.spawnJulia(path, args, provider))
      .then(proc => this.monitor(proc));

    // set working directory here, so we queue this task before anything else
    if (provider === 'Remote') {
      ssh.withRemoteConfig(conf => junorc(conf.remote)).catch(function() {});
    } else {
      paths.projectDir().then(dir => junorc(dir));
    }

    proc
      .then(proc => {
        return Promise.all([proc, proc.socket]);
    })
      .then((...args1) => {
        let sock;
        let proc;
        [proc, sock] = Array.from(args1[0]);
        return this.connect(proc, sock);
    }).catch(function(e) {
        client.detach();
        return console.error(`Julia exited with ${e}.`);
    });
    return proc;
  },

  spawnJulia(path, args, provider) {
    return this.provider(provider).get(path, args);
  }
};

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}