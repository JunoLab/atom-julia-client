/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { CompositeDisposable } from 'atom';
import { client } from '../connection';
import { formatTimePeriod } from '../misc';

export default {
  progs: {},

  activate() {
    this.subs = new CompositeDisposable;
    client.handle({'progress': (t, id, m) => this[t](id, m)});
    let status = [];
    this.subs.add(client.onWorking(() => {
        return status = this.ink != null ? this.ink.progress.add(null, {description: 'Julia'}) : undefined;
    })
    );
    this.subs.add(client.onDone(() => (status != null ? status.destroy() : undefined)));
    return this.subs.add(client.onDetached(() => this.clear()));
  },

  deactivate() {
    this.clear();
    return this.subs.dispose();
  },

  add(id) {
    const pr = this.ink.progress.add();
    pr.t0 = Date.now();
    pr.showTime = true;
    return this.progs[id] = pr;
  },

  progress(id, prog) {
    const pr = this.progs[id];
    if (pr == null) { return; }
    pr.level = prog;
    if (pr.showTime) { return this.rightText(id, null); }
  },

  message(id, m) { return (this.progs[id] != null ? this.progs[id].message = m : undefined); },

  leftText(id, m) { return (this.progs[id] != null ? this.progs[id].description = m : undefined); },

  rightText(id, m) {
    const pr = this.progs[id];
    if (pr == null) { return; }
    if (m != null ? m.length : undefined) {
      pr.rightText = m;
      return pr.showTime = false;
    } else {
      const dt = ((Date.now() - pr.t0)*((1/pr.level) - 1))/1000;
      pr.showTime = true;
      return pr.rightText = formatTimePeriod(dt);
    }
  },

  delete(id) {
    const pr = this.progs[id];
    if (pr == null) { return; }
    pr.destroy();
    return delete this.progs[id];
  },

  clear() {
    for (let _ in this.progs) {
      const p = this.progs[_];
      if (p != null) {
        p.destroy();
      }
    }
    return this.progs = {};
  }
};
