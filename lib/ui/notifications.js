'use babel'
import remote from 'remote';

export default {
  // notes: [],
  // window: remote.getCurrentWindow(),
  //
  activate() {
  //   document.addEventListener('focusin', () => {
  //     this.clear();
  //   });
  },

  enabled() { return atom.config.get('julia-client.uiOptions.notifications'); },

  show(msg, force) {
    // if (!force && (!this.enabled() || !!document.hasFocus())) { return; }
    // const n = new Notification("Julia Client",
    //   {body: msg});
    // n.onclick = () => {
    //   this.window.focus();
    // };
    // this.notes.push(n);
  },

  // clear() {
  //   for (let note of this.notes) {
  //     note.close();
  //   }
  //   this.notes = [];
  // }
};
