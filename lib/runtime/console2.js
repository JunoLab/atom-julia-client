'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import * as pty from 'node-pty-prebuilt'
import { debounce, once } from 'underscore-plus'

var { changemodule, resetprompt, validatepath, fullpath } = client.import({msg: ['changemodule', 'resetprompt'], rpc: ['validatepath', 'fullpath']})

let uriRegex
if (process.platform == 'win32') {
  uriRegex = /((([a-zA-Z]:|\.\.?|\~)|([^\0<>\?\|\/\s!$`&*()\[\]+'":;])+)?((\\|\/)([^\0<>\?\|\/\s!$`&*()\[\]+'":;])+)+)(\:\d+)?/
} else {
  uriRegex = /(((\.\.?|\~)|([^\0\s!$`&*()\[\]+'":;\\])+)?(\/([^\0\s!$`&*()\[\]+'":;\\])+)+)(\:\d+)?/
}

export var terminal

export function activate (ink) {
  if (atom.config.get('julia-client.juliaOptions.consoleStyle') != 'REPL-based') return

  let subs = new CompositeDisposable()

  terminal = ink.InkTerminal.fromId('julia-terminal')

  terminal.getTitle = () => {return 'REPL'}
  terminal.class = 'julia-terminal'

  terminal.write('\x1b[1m\x1b[32mPress Enter to start Julia.\x1b[0m\n\r')
  terminal.startRequested = () => client.boot()

  modules.onDidChange(debounce(() => changemodule({mod: modules.current(), cols: terminal.terminal.cols}), 200))

  let linkHandler

  client.onBoot((proc) => {
    terminal.attach(proc.ty)

    if (proc.flush) {
      proc.flush((d) => terminal.write(d), (d) => terminal.write(d))
    }

    linkHandler = (event, uri) => {
      let m = uri.match(/(.+)(?:\:(\d+))$/)
      fullpath(m[1]).then((path) => ink.Opener.open(path, parseInt(m[2]) - 1, {pending: true}))
    }

    let validator = (uri, cb) => {
      validatepath(uri).then((isvalid) => {
        cb(isvalid)
      })
    }
    if (process.platform != 'darwin') {
      terminal.attachCustomKeyEventHandler((e) => {
        // don't pass Ctrl-(Shift)-C/V to terminal
        if (e.ctrlKey && (e.keyCode == 67 || e.keyCode == 86)) {
          return false
        }
        return e
      })
    } else {
      terminal.attachCustomKeyEventHandler((e) => {
        // don't pass ctrl-c to terminal
        if (e.ctrlKey && e.keyCode == 67) {
          return false
        }
        return e
      })
    }
    // doesn't handle multiline URIs properly due to upstream bug (xterm.js#24)
    terminal.terminal.registerLinkMatcher(uriRegex, linkHandler, {validationCallback: validator})

    proc.onExit(() => {
      terminal.detach()
      terminal.write('\x1b[1m\r\x1b[31mJulia has exited.\x1b[0m Press Enter to start a new session.\n\r')
      terminal.terminal.deregisterLinkMatcher(linkHandler)
    })
  })

  client.handle({
    updateWorkspace: () => require('./workspace').update(),
    clearconsole: () => terminal.clear()
  })

  subs.add(atom.commands.add('atom-workspace', 'julia-client:open-console', () => {
    terminal.open().then(() => terminal.show())
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:clear-console', () => {
    terminal.clear()
  }))

  subs.add(atom.commands.add('.julia-terminal', 'julia-client:copy-or-interrupt', () => {
    if (!terminal.copySelection()) {
      atom.commands.dispatch(terminal.view, 'julia-client:interrupt-julia')
    }
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:new-terminal', () => {
    let term = ink.InkTerminal.fromId(`terminal-julia-${Math.floor(Math.random()*10000000)}`)
    shellPty().then((pty) => term.attach(pty, true))
    term.open().then(() => term.show())
  }))

  // handle deserialized terminals
  atom.workspace.getPaneItems().forEach((item) => {
    if (item.id && item.name === 'InkTerminal' && item.id.match(/terminal\-julia\-\d+/)) {
      if (!item.ty) {
        shellPty().then((pty) => item.attach(pty, true))
      }
    }
  })
}

function shellPty () {
  return new Promise((resolve) => paths.projectDir().then((cwd) => {
    resolve(pty.fork(atom.config.get("julia-client.shell"), [], {
      cols: 100,
      rows: 30,
      cwd: cwd
    }))
  }))
}

export function deactivate () {
  if (subs) subs.dispose()
}
