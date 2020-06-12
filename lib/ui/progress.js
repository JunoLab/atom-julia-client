'use babel'
import { CompositeDisposable } from 'atom';
import client  from '../connection/client';
import { formatTimePeriod } from '../misc';

export default {
  progs: {},

  activate(ink) {
    this.subs = new CompositeDisposable;
    this.ink = ink;
    client.handle({'progress': (t, id, m) => this[t](id, m)});
    let status = [];
    this.subs.add(
      client.onWorking(() => {
        return status = this.ink.progress.add(null, {description: 'Julia'});
      }),
      client.onDone(() => (status != null ? status.destroy() : undefined)), // status?.destroy()
      client.onAttached(() => this.ink.progress.show()),
      client.onDetached(() => this.clear())
    );
  },

  deactivate() {
    this.clear();
    this.subs.dispose();
  },

  add(id) {
    const pr = this.ink.progress.add();
    pr.t0 = Date.now();
    pr.showTime = true;
    this.progs[id] = pr;
  },

  progress(id, prog) {
    const pr = this.progs[id];
    if (pr == null) { return; }
    pr.level = prog;
    if (pr.showTime) { return this.rightText(id, null); }
  },

  message(id, m) { return (this.progs[id] != null ? this.progs[id].message = m : undefined); }, // this.progs[id]?.message = m

  leftText(id, m) { return (this.progs[id] != null ? this.progs[id].description = m : undefined); }, // this.progs[id]?.description = m

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
    delete this.progs[id];
  },

  clear() {
    for (let _ in this.progs) {
      const p = this.progs[_];
      if (p != null) {
        p.destroy();
      }
    }
    this.progs = {};
    this.ink.progress.hide();
  }
};
