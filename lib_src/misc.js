/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { debounce } from 'underscore-plus';

export default {
  paths:   require('./misc/paths'),
  blocks:  require('./misc/blocks'),
  cells:   require('./misc/cells'),
  words:   require('./misc/words'),
  weave:   require('./misc/weave'),
  colors:  require('./misc/colors'),
  scopes:  require('./misc/scopes'),

  bufferLines(t, f) {
    if ((f == null)) { [t, f] = Array.from([null, t]); }
    const buffer = [''];
    const flush = (t == null) ? function() {} : debounce((function() {
      if (buffer[0] !== '') {
        f(buffer[0], false);
        return buffer[0] = '';
      }}), t);
    return function(data) {
      const lines = data.toString().split('\n');
      buffer[0] += lines.shift();
      buffer.push(...Array.from(lines || []));
      while (buffer.length > 1) {
        f(buffer.shift(), true);
      }
      return flush();
    };
  },

  time(desc, p) {
    const s = () => new Date().getTime()/1000;
    const t = s();
    p.then(() => console.log(`${desc}: ${(s()-t).toFixed(2)}s`))
      .catch(function() {});
    return p;
  },

  hook(obj, method, f) {
    const souper = obj[method].bind(obj);
    return obj[method] = (...a) => f(souper, ...Array.from(a));
  },

  once(f) {
    let done = false;
    return function(...args) {
      if (done) { return; }
      done = true;
      return f.call(this, ...Array.from(args));
    };
  },

  mutex() {
    let wait = Promise.resolve();
    return function(f) {
      const current = wait;
      let release = null;
      wait = new Promise(resolve => release = resolve).catch(function() {});
      return current.then(() => f.call(this, release));
    };
  },

  exclusive(f) {
    const lock = module.exports.mutex();
    return function(...args) {
      return lock(release => {
        const result = f.call(this, ...Array.from(args));
        release(result);
        return result;
      });
    };
  },

  // takes a time period in seconds and formats it as hh:mm:ss
  formatTimePeriod(dt) {
    if (dt <= 1) { return; }
    const h = Math.floor(dt/(60*60));
    const m = Math.floor((dt -= h*60*60)/60);
    const s = Math.round((dt - (m*60)));
    const parts = [h, m, s];
    for (let i in parts) {
      dt = parts[i];
      parts[i] = dt < 10 ? `0${dt}` : `${dt}`;
    }
    return parts.join(':');
  }
};
