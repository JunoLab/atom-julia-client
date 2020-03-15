/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import os from 'os';
import net from 'net';
import path from 'path';
import fs from 'fs';
import child_process from 'child_process';
import { exclusive } from '../../misc';
import IPC from '../ipc';
import basic from './basic';
import cycler from './cycler';

export default {

  socketPath(name) {
    if (process.platform === 'win32') {
      return `\\\\.\\pipe\\${name}`;
    } else {
      return path.join(os.tmpdir(), `${name}.sock`);
    }
  },

  removeSocket(name) {
    return new Promise((resolve, reject) => {
      const p = this.socketPath(name);
      return fs.exists(p, function(exists) {
        if (!exists) { return resolve(); }
        return fs.unlink(p, function(err) {
          if (err) { return reject(err); } else { return resolve(); }
        });
      });
    });
  },

  // Client

  boot() {
    return this.removeSocket('juno-server').then(() => {
      return new Promise((resolve, reject) => {
        console.info('booting julia server');
        const proc = child_process.fork(path.join(__dirname, 'boot.js'), {
          detached: true,
          env: process.env
        }
        );
        proc.on('message', function(x) {
          if (x === 'ready') { return resolve();
          } else { return console.log('julia server:', x); }
        });
        return proc.on('exit', function(code, status) {
          console.warn('julia server:', [code, status]);
          return reject([code, status]);
        });
      });
    });
  },

  connect() {
    return new Promise((resolve, reject) => {
      var client = net.connect(this.socketPath('juno-server'), () => {
        const ipc = new IPC(client);
        return resolve(ipc.import(Object.keys(this.serverAPI()), true, {ipc}));
    });
      return client.on('error', err => reject(err));
    });
  },

  activate: exclusive(function() {
    if (this.server != null) { return this.server; }
    return this.connect()
      .catch(err => {
        if (['ECONNREFUSED', 'ENOENT'].includes(err.code)) {
          return this.boot().then(() => this.connect());
        } else { return Promise.reject(err); }
    }).then(server => {
        this.server = server;
        this.server.ipc.stream.on('end', () => delete this.server);
        this.server.setPS(basic.wrapperEnabled());
        return this.server;
    });
  }),

  getStream(id, s) {
    return this.connect().then(function({ipc}) {
      const sock = ipc.stream;
      ipc.msg(s, id);
      ipc.unreadStream();
      return sock;
    });
  },

  getStreams(id) { return Promise.all((['stdin', 'stdout', 'stderr'].map((s) => this.getStream(id, s)))); },

  getSocket(id) {
    return this.server.onBoot(id).then(() => {
      return this.getStream(id, 'socket').then(sock => {
        return this.server.onAttach(id).then(() => sock);
      });
    });
  },

  get(path, args) {
    return this.activate()
      .then(() => this.server.get(path, args))
      .then(id => Promise.all([id, this.getStreams(id), this.server.events(id)]))
      .then((...args1) => {
        const array = args1[0], id = array[0], [stdin, stdout, stderr] = Array.from(array[1]), events = array[2];
        return {
          stdin(data) { return stdin.write(data); },
          onStdout(f) { return stdout.on('data', f); },
          onStderr(f) { return stderr.on('data', f); },
          flush(out, err) { return cycler.flush(events, out, err); },
          interrupt: () => this.server.interrupt(id),
          kill:      () => this.server.kill(id),
          socket: this.getSocket(id),
          onExit: f => {
            return Promise.race([this.server.onExit(id),
                          new Promise(resolve => this.server.ipc.stream.on('end', resolve))])
              .then(f);
          }
        };
    });
  },

  start(path, args) {
    return this.activate()
      .then(() => this.server.start(path, args));
  },

  reset() {
    return this.connect()
      .then(server => server.exit().catch(function() {}))
      .catch(() => atom.notifications.addInfo('No server running.'));
  },

  // Server

  initIPC(sock) {
    // TODO: exit once all clients close
    const ipc = new IPC(sock);
    ipc.handle(this.serverAPI());
    this.streamHandlers(ipc);
    return ipc;
  },

  serve() {
    cycler.cacheLength = 2;
    basic.wrapperEnabled = () => true;
    this.server = net.createServer(sock => {
      return this.initIPC(sock);
    });
    this.server.listen(this.socketPath('juno-server'), () => process.send('ready'));
    return this.server.on('error', function(err) {
      process.send(err);
      return process.exit();
    });
  },

  pid: 0,
  ps: {},

  serverAPI() {

    return {
      setPS(enabled) { return basic.wrapperEnabled = () => enabled; },

      get: (path, args) => {
        return cycler.get(path, args)
          .then(p => {
            p.id = (this.pid += 1);
            this.ps[p.id] = p;
            return p.id;
        });
      },

      start(path, args) { return cycler.start(path, args); },

      onBoot: id => this.ps[id].socket.then(() => true),
      onExit: id => new Promise(resolve => this.ps[id].onExit(resolve)),
      onAttach: id => this.ps[id].attached.then(function() {}),
      interrupt: id => this.ps[id].interrupt(),
      kill: id => this.ps[id].kill(),

      events: id => {
        const proc = this.ps[id];
        const events = proc.events != null ? proc.events : [];
        delete proc.events;
        for (let event of events) {
          event.data = event.data != null ? event.data.toString() : undefined;
        }
        return events;
      },

      exit: () => {
        cycler.reset();
        for (let id in this.ps) {
          const proc = this.ps[id];
          proc.kill();
        }
        return process.exit();
      }
    };
  },

  crossStreams(a, b) {
    return [[a, b], [b, a]].forEach(function(...args) {
      const [from, to] = Array.from(args[0]);
      return from.on('data', function(data) {
        try { return to.write(data); }
        catch (e) {
          if (process.connected) {
            return process.send({type: 'error', message: e.message, stack: e.stack, data: data.toString()});
          }
        }
    });});
  },

  mutualClose(a, b) {
    return [[a, b], [b, a]].forEach(function(...args) {
      const [from, to] = Array.from(args[0]);
      from.on('end', () => to.end());
      return from.on('error', () => to.end());
    });
  },

  streamHandlers(ipc) {
    return ['socket', 'stdout', 'stderr', 'stdin'].forEach(stream => {
      return ipc.handle(stream, id => {
        const proc = this.ps[id];
        const sock = ipc.stream;
        ipc.unreadStream();
        const source = stream === 'socket' ? proc.socket : proc.proc[stream];
        return proc.attached = Promise.resolve(source).then(source => {
          this.crossStreams(source, sock);
          if (stream === 'socket') { return this.mutualClose(source, sock);
          } else { return sock.on('end', () => proc.kill()); }
        });
      });
    });
  }
};
