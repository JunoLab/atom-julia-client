/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { isEqual } from 'underscore-plus';
import hash from 'object-hash';
import basic from './basic';
import IPC from '../ipc';

export default {
  provider() {
    return basic;
  },

  cacheLength: 1,

  procs: {},

  key(path, args) { return hash([path, ...Array.from(args)].join(' ').trim()); },

  cache(path, args) { let name;
  return this.procs[name = this.key(path, args)] != null ? this.procs[name] : (this.procs[name] = []); },

  removeFromCache(path, args, obj) {
    const key = this.key(path, args);
    return this.procs[key] = this.procs[key].filter(x => x !== obj);
  },

  toCache(path, args, proc) {
    proc.cached = true;
    return this.cache(path, args).push(proc);
  },

  fromCache(path, args) {
    const ps = this.cache(path, args);
    const p = ps.shift();
    if (p == null) { return; }
    p.cached = false;
    return p.init.then(() => {
      this.start(path, args);
      return p.proc;
    });
  },

  start(path, args) {
    const allArgs = [args, atom.config.get('julia-client.juliaOptions')];
    this.provider().lock(release => {
      if (this.cache(path, allArgs).length < this.cacheLength) {
        const p = this.provider().get_(path, args).then(proc => {
          const obj = {path, allArgs, proc};
          this.monitor(proc);
          this.warmup(obj);
          this.toCache(path, allArgs, obj);
          proc.socket
            .then(() => this.start(path, allArgs))
            .catch(e => this.removeFromCache(path, allArgs, obj));
          return release(proc.socket);
        });
        return p.catch(err => {
          return release();
        });
      } else {
        return release();
      }
    });
  },

  flush(events, out, err) {
    return (() => {
      const result = [];
      for (let {type, data} of events) {
        result.push((type === 'stdout' ? out : err)(data));
      }
      return result;
    })();
  },

  monitor(proc) {
    proc.events = [];
    proc.wasCached = true;
    proc.onStdout(data => proc.events != null ? proc.events.push({type: 'stdout', data}) : undefined);
    proc.onStderr(data => proc.events != null ? proc.events.push({type: 'stderr', data}) : undefined);
    return proc.flush = (out, err) => {
      this.flush(proc.events, out, err);
      return delete proc.events;
    };
  },

  boot(ipc) { return ipc.rpc('ping'); },
  repl(ipc) { return ipc.rpc('changemodule', {mod: 'Main'}); },

  warmup(obj) {
    obj.init = Promise.resolve();
    return obj.proc.socket
      .then(sock => {
        if (!obj.cached) { return; }
        const ipc = new IPC(sock);
        [this.boot, this.repl].forEach(f => obj.init = obj.init.then(function() {
          if (obj.cached) { return f(ipc); }
        }));
        obj.init = obj.init
          .catch(err => console.warn('julia warmup error:', err))
          .then(() => ipc.unreadStream());
        
    }).catch(function() {});
  },

  get(path, args) {
    let p, proc;
    const allArgs = [args, atom.config.get('julia-client.juliaOptions')];
    if (proc = this.fromCache(path, allArgs)) { p = proc;
    } else { p = this.provider().get(path, args); }
    this.start(path, args);
    return p;
  },

  reset() {
    return (() => {
      const result = [];
      for (let key in this.procs) {
        const ps = this.procs[key];
        result.push(ps.map((p) =>
          p.proc.kill()));
      }
      return result;
    })();
  }
};
