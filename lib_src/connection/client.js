/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { throttle } from 'underscore-plus';
import { Emitter } from 'atom';
import IPC from './ipc';

export default {

  // Connection logic injects a connection via `attach`.
  //# Required interface:
  // .message(json)
  //# Optional interface:
  // .stdin(data)
  // .interrupt()
  // .kill()

  // Messaging

  ipc: new IPC,

  handle(...a) { return this.ipc.handle(...Array.from(a || [])); },
  input(m)  { return this.ipc.input(m); },
  readStream(s) { return this.ipc.readStream(s); },
  import(...a) { return this.ipc.import(...Array.from(a || [])); },

  activate() {

    this.emitter = new Emitter;

    this.bootMode = atom.config.get('julia-client.juliaOptions.bootMode');

    this.ipc.writeMsg = msg => {
      if (this.isActive() && ((typeof this.conn.ready === 'function' ? this.conn.ready() : undefined) !== false)) {
        return this.conn.message(msg);
      } else {
        return this.ipc.queue.push(msg);
      }
    };

    this.handle('error', options => {
      if (atom.config.get('julia-client.uiOptions.errorNotifications')) {
        atom.notifications.addError(options.msg, options);
      }
      console.error(options.detail);
      return atom.beep();
    });

    let plotpane = null;

    this.onAttached(() => {
      const args = atom.config.get('julia-client.juliaOptions.arguments');
      this.import('connected')();
      if (args.length > 0) {
        this.import('args')(args);
      }

      return plotpane = atom.config.observe('julia-client.uiOptions.usePlotPane', use => {
        return this.import('enableplotpane')(use);
      });
    });

    this.onDetached(() => {
      return (plotpane != null ? plotpane.dispose() : undefined);
    });

    return this.onBoot(proc => {
      return this.remoteConfig = proc.config;
    });
  },

  setBootMode(bootMode) {
    this.bootMode = bootMode;
  },

  editorPath(ed) {
    if ((ed == null)) { return ed; }
    if ((this.bootMode === 'Remote') && (this.remoteConfig != null)) {
      let path = ed.getPath();
      if ((path == null)) { return path; }
      const ind = path.indexOf(this.remoteConfig.host);
      if (ind > -1) {
        path = path.slice(ind + this.remoteConfig.host.length, path.length);
        path = path.replace(/\\/g, '/');
        return path;
      } else {
        return path;
      }
    } else {
      return ed.getPath();
    }
  },

  deactivate() {
    this.emitter.dispose();
    if (this.isActive()) { return this.detach(); }
  },

  // Basic handlers (communication through stderr)

  basicHandlers: {},

  basicHandler(s) {
    let match;
    if (match = s.toString().match(/juno-msg-(.*)/)) {
      if (typeof this.basicHandlers[match[1]] === 'function') {
        this.basicHandlers[match[1]]();
      }
      return true;
    }
  },

  handleBasic(msg, f) { return this.basicHandlers[msg] = f; },

  // Connecting & Booting

  emitter: new Emitter,

  onAttached(cb) { return this.emitter.on('attached', cb); },
  onDetached(cb) { return this.emitter.on('detached', cb); },

  onceAttached(cb) {
    let f;
    return f = this.onAttached(function(...args) {
      f.dispose();
      return cb.call(this, ...Array.from(args));
    });
  },

  isActive() { return (this.conn != null); },

  attach(conn) {
    this.conn = conn;
    if ((typeof this.conn.ready === 'function' ? this.conn.ready() : undefined) !== false) { this.flush(); }
    return this.emitter.emit('attached');
  },

  detach() {
    delete this.conn;
    this.ipc.reset();
    return this.emitter.emit('detached');
  },

  flush() { return this.ipc.flush(); },

  isWorking() { return this.ipc.isWorking(); },
  onWorking(f) { return this.ipc.onWorking(f); },
  onDone(f) { return this.ipc.onDone(f); },
  onceDone(f) { return this.ipc.onceDone(f); },

  // Management & UI

  onStdout(f) { return this.emitter.on('stdout', f); },
  onStderr(f) { return this.emitter.on('stderr', f); },
  onInfo(f) { return this.emitter.on('info', f); },
  onBoot(f) { return this.emitter.on('boot', f); },
  stdout(data) { return this.emitter.emit('stdout', data); },
  stderr(data) { if (!this.basicHandler(data)) { return this.emitter.emit('stderr', data); } },
  info(data) { return this.emitter.emit('info', data); },

  clientCall(name, f, ...args) {
    if ((this.conn[f] == null)) {
      return atom.notifications.addError(`This client doesn't support ${name}.`);
    } else {
      return this.conn[f].call(this.conn, ...Array.from(args));
    }
  },

  stdin(data) { return this.clientCall('STDIN', 'stdin', data); },

  interrupt() {
    if (this.isActive()) {
      return this.clientCall('interrupts', 'interrupt');
    }
  },

  disconnect() {
    if (this.isActive()) {
      return this.clientCall('disconnecting', 'disconnect');
    }
  },

  kill() {
    if (this.isActive()) {
      if (!this.isWorking()) {
        return this.import('exit')().catch(function() {});
      } else {
        return this.clientCall('kill', 'kill');
      }
    } else {
      return this.ipc.reset();
    }
  },

  clargs() {
    const {precompiled, optimisationLevel, deprecationWarnings} =
      atom.config.get('julia-client.juliaOptions');
    let as = [];
    as.push(`--depwarn=${deprecationWarnings ? 'yes' : 'no'}`);
    if (optimisationLevel !== 2) { as.push(`-O${optimisationLevel}`); }
    as.push("--color=yes");
    as.push("-i");
    const startupArgs = atom.config.get('julia-client.juliaOptions.startupArguments');
    if (startupArgs.length > 0) {
      as = as.concat(startupArgs);
    }
    as = as.map(arg => arg.trim());
    as = as.filter(arg => arg.length > 0);
    return as;
  },

  connectedError(action = 'do that') {
    if (this.isActive()) {
      atom.notifications.addError(`Can't ${action} with a Julia client running.`,
        {description: "Stop the current client with `Packages -> Juno -> Stop Julia`."});
      return true;
    } else {
      return false;
    }
  },

  notConnectedError(action = 'do that') {
    if (!this.isActive()) {
      atom.notifications.addError(`Can't ${action} without a Julia client running.`,
        {description: "Start a client with `Packages -> Juno -> Start Julia`."});
      return true;
    } else {
      return false;
    }
  },

  require(a, f) {
    if (f == null) { [a, f] = Array.from([null, a]); }
    return this.notConnectedError(a) || f();
  },

  disrequire(a, f) {
    if (f == null) { [a, f] = Array.from([null, a]); }
    return this.connectedError(a) || f();
  },

  withCurrent(f) {
    const current = this.conn;
    return (...a) => {
      if (current !== this.conn) { return; }
      return f(...Array.from(a || []));
    };
  }
};
