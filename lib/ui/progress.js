'use babel'
import { CompositeDisposable } from 'atom';
import client  from '../connection/client';
import { formatTimePeriod } from '../misc';

export let progs = {}

let subs;
let ink;
export function activate(ink_in) {
    subs = new CompositeDisposable;
    ink = ink_in;
    client.handle({'progress': (t, id, m) => this[t](id, m)});
    let status = [];
    subs.add(
      client.onWorking(() => {
        return status = ink.progress.add(null, {description: 'Julia'});
      }),
      client.onDone(() => (status != null ? status.destroy() : undefined)), // status?.destroy()
      client.onAttached(() => ink.progress.show()),
      client.onDetached(() => clear())
    );
}

export function deactivate() {
    clear();
    subs.dispose();
}

export function add(id) {
    const pr = ink.progress.add();
    pr.t0 = Date.now();
    pr.showTime = true;
    progs[id] = pr;
}

export function progress(id, prog) {
    const pr = progs[id];
    if (pr == null) { return; }
    pr.level = prog;
    if (pr.showTime) { return rightText(id, null); }
}

export function message(id, m) { return (progs[id] != null ? progs[id].message = m : undefined); } // progs[id]?.message = m

export function leftText(id, m) { return (progs[id] != null ? progs[id].description = m : undefined); } // progs[id]?.description = m

export function rightText(id, m) {
    const pr = progs[id];
    if (pr == null) { return; }
    if (m != null ? m.length : undefined) {
      pr.rightText = m;
      return pr.showTime = false;
    } else {
      const dt = ((Date.now() - pr.t0)*((1/pr.level) - 1))/1000;
      pr.showTime = true;
      return pr.rightText = formatTimePeriod(dt);
    }
}

export function deleteit(id) {
    const pr = progs[id];
    if (pr == null) { return; }
    pr.destroy();
    delete progs[id];
}

export function clear() {
    for (let _ in progs) {
      const p = progs[_];
      if (p != null) {
        p.destroy();
      }
    }
    progs = {};
    ink.progress.hide();
}
