/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let IPC;
let Loading = null;
const lwaits = [];
const withLoading = function(f) { if (Loading != null) { return f(); } else { return lwaits.push(f); } };

const {bufferLines} = require('../misc');

export default IPC = class IPC {

  static consumeInk(ink) {
    ({
      Loading
    } = ink);
    return lwaits.map((f) => f());
  }

  constructor(stream) {
    withLoading(() => {
      return this.loading = new Loading;
    });
    this.handlers = {};
    this.callbacks = {};
    this.queue = [];
    this.id = 0;

    if (stream != null) { this.setStream(stream); }

    this.handle({
      cb: (id, result) => {
        if (this.callbacks[id] != null) {
          this.callbacks[id].resolve(result);
        }
        return delete this.callbacks[id];
      },

      cancelCallback: (id, e) => {
        return this.callbacks[id].reject(e);
      }
    });
  }

  handle(type, f?) {
    if (f != null) {
      return this.handlers[type] = f;
    } else {
      return (() => {
        const result = [];
        for (let t in type) {
          f = type[t];
          result.push(this.handle(t, f));
        }
        return result;
      })();
    }
  }

  writeMsg() { throw new Error('msg not implemented'); }

  msg(type, ...args) { return this.writeMsg([type, ...Array.from(args)]); }

  rpc(type, ...args) {
    const p = new Promise((resolve, reject) => {
      this.id += 1;
      this.callbacks[this.id] = {resolve, reject};
      return this.msg({type, callback: this.id}, ...Array.from(args));
    });
    return (this.loading != null ? this.loading.monitor(p) : undefined);
  }

  flush() {
    for (let msg of this.queue) { this.writeMsg(msg); }
    return this.queue = [];
  }

  reset() {
    if (this.loading != null) {
      this.loading.reset();
    }
    this.queue = [];
    for (let id in this.callbacks) { const cb = this.callbacks[id]; cb.reject('disconnected'); }
    return this.callbacks = {};
  }

  input(...args) {
    let callback, type;
    [type, ...args] = Array.from(args[0]);
    if (type.constructor === Object) {
      ({type, callback} = type);
    }
    if (this.handlers.hasOwnProperty(type)) {
      const result = Promise.resolve().then(() => this.handlers[type](...Array.from(args || [])));
      if (callback) {
        return result
          .then(result => this.msg('cb', callback, result))
          .catch(err => {
            console.error(err);
            return this.msg('cancelCallback', callback, this.errJson(err));
        });
      }
    } else {
      return console.log(`julia-client: unrecognised message ${type}`, args);
    }
  }

  import(fs, rpc = true, mod = {}) {
    if (fs == null) { return; }
    if (fs.constructor === String) { return this.import([fs], rpc, mod)[fs]; }
    if ((fs.rpc != null) || (fs.msg != null)) {
      mod = {};
      this.import(fs.rpc, true,  mod);
      this.import(fs.msg, false, mod);
    } else {
      fs.forEach(f => {
        return mod[f] = (...args) => {
          if (rpc) { return this.rpc(f, ...Array.from(args)); } else { return this.msg(f, ...Array.from(args)); }
        };
      });
    }
    return mod;
  }

  isWorking() { return (this.loading != null ? this.loading.isWorking() : undefined); }
  onWorking(f) { return (this.loading != null ? this.loading.onWorking(f) : undefined); }
  onDone(f) { return (this.loading != null ? this.loading.onDone(f) : undefined); }
  onceDone(f) { return (this.loading != null ? this.loading.onceDone(f) : undefined); }

  errJson(obj) {
    if (!(obj instanceof Error)) { return; }
    return {type: 'error', message: obj.message, stack: obj.stack};
  }

  readStream(s) {
    let cb;
    s.on('data', (cb = bufferLines(m => { if (m) { return this.input(JSON.parse(m)); } })));
    return this.unreadStream = () => s.removeListener('data', cb);
  }

  writeStream(s) {
    return this.writeMsg = function(m) {
      s.write(JSON.stringify(m));
      return s.write('\n');
    };
  }

  setStream(stream) {
    this.stream = stream;
    this.readStream(this.stream);
    this.writeStream(this.stream);
    return this.stream.on('end', () => this.reset());
  }
};
