'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import * as pty from 'node-pty-prebuilt'
import { debounce, once } from 'underscore-plus'
import { customSelector } from '../ui'

var { changeprompt, changemodule, resetprompt, validatepath, fullpath } =
      client.import({msg: ['changeprompt', 'changemodule', 'resetprompt'], rpc: ['validatepath', 'fullpath']})

let uriRegex
if (process.platform == 'win32') {
  uriRegex = /(@ ([^\s]+)\s(.*?)\:(\d+)|((([a-zA-Z]:|\.\.?|\~)|([^\0<>\?\|\/\s!$`&*()\[\]+'":;])+)?((\\|\/)([^\0<>\?\|\/\s!$`&*()\[\]+'":;])+)+)(\:\d+)?)/
} else {
  uriRegex = /(@ ([^\s]+)\s(.*?)\:(\d+)|(((\.\.?|\~)|([^\0\s!$`&*()\[\]+'":;\\])+)?(\/([^\0\s!$`&*()\[\]+'":;\\])+)+)(\:\d+)?)/
}

var whitelistedKeybindingsREPL = []
var whitelistedKeybindingsTerminal = []

export var terminal

export function activate (ink) {
  if (atom.config.get('julia-client.consoleOptions.consoleStyle') != 'REPL-based') return

  process.env.TERM = 'xterm-256color'

  let subs = new CompositeDisposable()

  subs.add(atom.config.observe('julia-client.consoleOptions.whitelistedKeybindingsREPL', (kbds) => {
    whitelistedKeybindingsREPL = kbds.map(s => s.toLowerCase())
  }))
  subs.add(atom.config.observe('julia-client.consoleOptions.whitelistedKeybindingsTerminal', (kbds) => {
    whitelistedKeybindingsTerminal = kbds.map(s => s.toLowerCase())
  }))

  terminal = ink.InkTerminal.fromId('julia-terminal', {
    scrollback: atom.config.get('julia-client.consoleOptions.maximumConsoleSize'),
    cursorStyle: atom.config.get('julia-client.consoleOptions.cursorStyle'),
    rendererType: atom.config.get('julia-client.consoleOptions.rendererType') ? 'dom' : 'canvas'
  })

  terminal.setTitle('REPL', true)
  terminal.class = 'julia-terminal'

  terminal.write('\x1b[1m\x1b[32mPress Enter to start Julia. \x1b[0m\n\r')
  terminal.startRequested = () => {
    client.boot()
    terminal.startRequested = () => {}
  }

  terminal.attachCustomKeyEventHandler(e => {
    if (whitelistedKeybindingsREPL.indexOf(atom.keymaps.keystrokeForKeyboardEvent(e)) > -1) {
      return false
    }
    return e
  })

  modules.onDidChange(debounce(() => changemodule({mod: modules.current()}), 200))

  client.handle({
    updateWorkspace: () => require('./workspace').update(),
    clearconsole: () => terminal.clear(),
    cursorpos: () => terminal.cursorPosition()
  })

  let linkHandler, promptObserver
  client.onBoot((proc) => {
    terminal.attach(proc.ty)

    if (proc.flush) {
      proc.flush((d) => terminal.write(d), (d) => terminal.write(d))
    }

    promptObserver = atom.config.observe('julia-client.consoleOptions.prompt', (prompt) => {
      changeprompt(prompt + ' ')
    })

    linkHandler = (event, uri) => {
      if (client.isActive()) {
        fullpath(uri).then(([path, line]) => {
          ink.Opener.open(path, line - 1, {pending: true})
        })
      }
    }

    let validator = (uri, cb) => {
      // FIXME: maybe choose something less arbitrary for the path length limit:
      if (client.isActive() && uri.length < 500) {
        validatepath(uri).then((isvalid) => {
          cb(isvalid)
        })
      } else {
        cb(false)
      }
    }

    terminal.terminal.registerLinkMatcher(uriRegex, linkHandler, {validationCallback: validator})
  })

  client.onDetached(() => {
    terminal.detach()
    terminal.write('\n\r\x1b[1m\r\x1b[31mJulia has exited.\x1b[0m Press Enter to start a new session.\n\r')
    terminal.terminal.deregisterLinkMatcher(linkHandler)
    if (promptObserver) promptObserver.dispose()
    terminal.startRequested = () => {
      client.boot()
      terminal.startRequested = () => {}
    }
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
    let term = ink.InkTerminal.fromId(`terminal-julia-${Math.floor(Math.random()*10000000)}`, {
      scrollback: atom.config.get('julia-client.consoleOptions.maximumConsoleSize'),
      cursorStyle: atom.config.get('julia-client.consoleOptions.cursorStyle'),
      rendererType: atom.config.get('julia-client.consoleOptions.rendererType') ? 'dom' : 'canvas'
    })
    term.attachCustomKeyEventHandler(handleWhitelistedKeybindingTerminal)
    shellPty().then(({pty, cwd}) => {
      term.attach(pty, true, cwd)
      term.open().then(() => term.show())
    }).catch((e) => console.error(e))
  }))

  // handle deserialized terminals
  atom.workspace.getPaneItems().forEach((item) => {
    if (item.id && item.name === 'InkTerminal' && item.id.match(/terminal\-julia\-\d+/)) {
      if (!item.ty) {
        item.attachCustomKeyEventHandler(handleWhitelistedKeybindingTerminal)
        shellPty(item.persistentState.cwd)
          .then(({pty, cwd}) => item.attach(pty, true, cwd))
          .catch(() => {})
      }
    }
  })
}

function handleWhitelistedKeybindingTerminal (e) {
  if (whitelistedKeybindingsTerminal.indexOf(atom.keymaps.keystrokeForKeyboardEvent(e)) > -1) {
    return false
  }
  return e
}

function shellPty (cwd) {
  return new Promise((resolve, reject) => {
    let pr
    if (cwd) {
      pr = new Promise((resolve) => resolve(cwd))
    } else {
      pr = customSelector.show(atom.workspace.project.getDirectories().map((el) => el.path), {emptyMessage: 'Enter a custom path above.'})
    }
    pr.then((cwd) => {
      if (cwd) {
        cwd = paths.expandHome(cwd)
        if (!require('fs').existsSync(cwd)) {
          cwd = paths.home()
        }
        resolve({
          pty: pty.fork(atom.config.get("julia-client.consoleOptions.shell"), [], {
            cols: 100,
            rows: 30,
            cwd: cwd
          }),
          cwd: cwd})
      } else {
        reject()
      }
    })
  })
}

export function deactivate () {
  // detach node-pty process from ink terminals; necessary for updates to work cleanly
  atom.workspace.getPaneItems().forEach((item) => {
    if (item.id && item.name === 'InkTerminal' && item.id.match(/terminal\-julia\-\d+/)) {
      item.detach()
    }
  })
  terminal.detach()

  if (subs) subs.dispose()
}
