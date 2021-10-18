'use babel'
// TODO use underscore
import { debounce } from 'underscore-plus';

// TODO use babel to export ... from ...
import * as paths  from './misc/paths'
import * as blocks from './misc/blocks'
import * as cells  from './misc/cells'
import * as words  from './misc/words'
import * as weave  from './misc/weave'
import * as colors from './misc/colors'
import * as scopes from './misc/scopes'

export function bufferLines(t, f) {
    if (!f) { [t, f] = [null, t]; }
    const buffer = [''];
    const flush = (t == null) ? ()=>{} : debounce(( () => {
      if (buffer[0] !== '') {
        f(buffer[0], false);
        buffer[0] = '';
      }}), t);
    return function(data) {
      const lines = data.toString().split('\n');
      buffer[0] += lines.shift();
      buffer.push(...lines);
      while (buffer.length > 1) {
        f(buffer.shift(), true);
      }
      flush();
    };
}

export function time(desc, p) {
    const s = () => new Date().getTime()/1000;
    const t = s();
    p.then(() => console.log(`${desc}: ${(s()-t).toFixed(2)}s`))
      .catch(()=>{});
    return p;
}

export function hook(obj, method, f) {
    const souper = obj[method].bind(obj);
    return obj[method] = (...a) => f(souper, ...a);
}

export function once(f) {
    let done = false;
    return function(...args) {
      if (done) { return; }
      done = true;
      return f.call(this, ...args);
    };
}

export function mutex() {
    let wait = Promise.resolve();
    return function(f) {
      const current = wait;
      let release = null;
      wait = new Promise(resolve => release = resolve).catch(function() {});
      return current.then(() => f.call(this, release));
    };
}

export function exclusive(f) {
    const lock = module.exports.mutex();
    return function(...args) {
      return lock(release => {
        const result = f.call(this, ...args);
        release(result);
        return result;
      });
    };
}

// takes a time period in seconds and formats it as hh:mm:ss
export function formatTimePeriod(dt) {
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

exports.paths = paths
exports.blocks = blocks
exports.cells = cells
exports.words = words
exports.weave = weave
exports.colors = colors
exports.scopes = scopes
