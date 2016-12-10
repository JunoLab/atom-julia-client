'use babel'

import { CompositeDisposable } from 'atom';
import { views } from '../ui';
import { client } from '../connection';

import workspace from './workspace';
import cons from './console';

let {nextline, stepin, finish, stepexpr, bp} =
  client.import(['nextline', 'stepin', 'finish', 'stepexpr', 'bp']);

let breakpoints = null;

export default {
  activate() {
    this.subs = new CompositeDisposable;

    client.handle({
      debugmode: state => this.debugmode(state),
      stepto: (file, line, text) => this.stepto(file, line, text)
    });

    return this.subs.add(client.onDetached(() => this.debugmode(false)));
  },

  deactivate() {
    return this.subs.dispose();
  },

  activeError() {
    if (!this.active) {
      atom.notifications.addError("You need to be debugging to do that.", {
        detail: `You can enter debugging by setting a breakpoint, or
by calling \`@step f(args...)\`.`,
        dismissable: true
      }
      );
      return true;
    }
  },

  require(f) { return this.activeError() || f(); },

  debugmode(active) {
    this.active = active;
    if (!this.active) {
      this.stepper.destroy();
      return workspace.update();
    } else {
      return cons.c.input();
    }
  },

  stepto(file, line, text) {
    this.stepper.goto(file, line-1);
    this.stepper.setText(views.render(text));
    return workspace.update();
  },

  nextline() { return this.require(() => nextline()); },
  stepin() { return this.require(() => stepin()); },
  finish() { return this.require(() => finish()); },
  stepexpr() { return this.require(() => stepexpr()); },

  breakpoints: [],

  bp(file, line) {
    let existing;
    if ((existing = breakpoints.get(file, line, this.breakpoints)[0]) != null) {
      this.breakpoints = this.breakpoints.filter(x => x !== existing);
      return existing.destroy();
    }
    let thebp = breakpoints.add(file, line);
    return this.breakpoints.push(thebp);
  },

  togglebp(ed = atom.workspace.getActiveTextEditor()) {
    if (!ed) { return; }
    return ed.getCursors().map((cursor) =>
      this.bp(ed.getPath(), cursor.getBufferPosition().row));
  },

  consumeInk(ink) {
    this.stepper = new ink.Stepper({
      buttons: [
        {icon: 'link-external', command: 'julia-debug:finish-function'},
        {icon: 'triangle-right', command: 'julia-debug:step-to-next-expression'},
        {icon: 'sign-in', command: 'julia-debug:step-into-function'}
      ]});
    ({ breakpoints } = ink);
    return this.subs.add(breakpoints.addScope('source.julia'));
  }
};
