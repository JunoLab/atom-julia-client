/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import child_process from 'child_process';
import net from 'net';
import tcp from './process/tcp';
import client from './client';
import { paths } from '../misc';

const disrequireClient = (a, f) => client.disrequire(a, f);

export default {

  escpath(p) { return '"' + p + '"'; },
  escape(sh) { return sh.replace(/"/g, '\\"'); },

  exec(sh) {
    return child_process.exec(sh, function(err, stdout, stderr) {
      if (err != null) {
        return console.log(err);
      }
    });
  },

  term(sh) {
    switch (process.platform) {
      case "darwin":
        this.exec("osascript -e 'tell application \"Terminal\" to activate'");
        return this.exec(`osascript -e 'tell application \"Terminal\" to do script \"${this.escape(sh)}\"'`);
      case "win32":
        return this.exec(`${this.terminal()} \"${sh}\"`);
      default:
        return this.exec(`${this.terminal()} \"${this.escape(sh)}\"`);
    }
  },

  terminal() { return atom.config.get("julia-client.consoleOptions.terminal"); },

  defaultShell() {
    const sh = process.env["SHELL"];
    if (sh != null) {
      return sh;
    } else if (process.platform === 'win32') {
      return 'powershell.exe';
    } else {
      return 'bash';
    }
  },

  defaultTerminal() {
    if (process.platform === 'win32') {
      return 'cmd /C start cmd /C';
    } else {
      return 'x-terminal-emulator -e';
    }
  },

  repl() { return this.term(`${this.escpath(paths.jlpath())}`); },

  connectCommand() {
    return tcp.listen().then(port => {
      return `${this.escpath(paths.jlpath())} ${client.clargs().join(' ')} ${paths.script('boot_repl.jl')} ${port}`;
    });
  },

  connectedRepl() { return this.connectCommand().then(cmd => this.term(cmd)); }
};
