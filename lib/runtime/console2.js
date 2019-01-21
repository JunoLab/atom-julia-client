'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import * as pty from 'node-pty-prebuilt'
import { debounce, once } from 'underscore-plus'
import { customSelector } from '../ui'
import { withRemoteConfig } from '../connection/process/remote'
import * as ssh from 'ssh2'

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

  terminal = ink.InkTerminal.fromId('julia-terminal', terminalOptions())

  terminal.setTitle('REPL', true)
  terminal.class = 'julia-terminal'

  terminal.write('\x1b[1m\x1b[32mPress Enter to start Julia. \x1b[0m\n\r')
  terminal.startRequested = () => {
    client.boot()
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

    if (proc.config) {
      terminal.setTitle('REPL @ '+proc.config.name, true)
    } else {
      terminal.setTitle('REPL', true)
    }

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
    terminal.setTitle('REPL', true)
    terminal.detach()
    // make sure to switch to the normal termbuffer, otherwise there might be
    // issues when leaving an xterm session:
    terminal.write('\x1b[?1049h')
    terminal.write('\x1b[?1049l')
    // disable mouse event capturing in case it was left enabled
    terminal.write('\x1b[?1003h')
    terminal.write('\x1b[?1003l')
    // reset focus events
    terminal.write('\x1b[?1004h')
    terminal.write('\x1b[?1004l')
    terminal.write('\n\r\x1b[1m\r\x1b[31mJulia has exited.\x1b[0m Press Enter to start a new session.\n\r')
    terminal.terminal.deregisterLinkMatcher(linkHandler)
    if (promptObserver) promptObserver.dispose()
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
    let term = ink.InkTerminal.fromId(`terminal-julia-${Math.floor(Math.random()*10000000)}`, terminalOptions())
    term.attachCustomKeyEventHandler(handleWhitelistedKeybindingTerminal)
    shellPty().then(({pty, cwd}) => {
      term.attach(pty, true, cwd)
      term.open().then(() => term.show())
    }).catch((e) => console.error(e))
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:new-remote-terminal', () => {
    let term = ink.InkTerminal.fromId(`terminal-remote-julia-${Math.floor(Math.random()*10000000)}`, terminalOptions())
    term.attachCustomKeyEventHandler(handleWhitelistedKeybindingTerminal)
    remotePty().then(({pty, cwd, conf}) => {
      term.attach(pty, true, cwd)
      term.setTitle(`Terminal @ ${conf.name}`)
      term.open().then(() => term.show())
      pty.on('close', () => term.detach())
    }).catch((e) => console.error(e))
  }))

  subs.add(atom.workspace.onDidStopChangingActivePaneItem(item => {
    if (item && item.id && item.name === 'InkTerminal' && item.element.initialized) {
      let rt = atom.config.get('julia-client.consoleOptions.rendererType') ? 'dom' : 'canvas'
      if (item.terminal.getOption('rendererType') != rt) {
        item.terminal.setOption('rendererType', rt)
        item.persistentState['rendererType'] = rt
        item.terminal.focus()
      }
    }
  }))

  // handle deserialized terminals
  forEachPane(item => {
    if (!item.ty) {
      item.attachCustomKeyEventHandler(handleWhitelistedKeybindingTerminal)
      shellPty(item.persistentState.cwd)
        .then(({pty, cwd}) => item.attach(pty, true, cwd))
        .catch(() => {})
    }
  }, /terminal\-julia\-\d+/)
  forEachPane(item => item.close(), /terminal\-remote\-julia\-\d+/)
}

function terminalOptions () {
  let opts = {
    scrollback: atom.config.get('julia-client.consoleOptions.maximumConsoleSize'),
    cursorStyle: atom.config.get('julia-client.consoleOptions.cursorStyle'),
    rendererType: atom.config.get('julia-client.consoleOptions.rendererType') ? 'dom' : 'canvas',
  }
  if (process.platform === 'darwin') {
    opts.macOptionIsMeta = atom.config.get('julia-client.consoleOptions.macOptionIsMeta')
  }
  return opts
}

function forEachPane (f, id = /terminal\-julia\-\d+/) {
  atom.workspace.getPaneItems().forEach((item) => {
    if (item.id && item.name === 'InkTerminal' && item.id.match(id)) {
      f(item)
    }
  })
}

function handleWhitelistedKeybindingTerminal (e) {
  if (whitelistedKeybindingsTerminal.indexOf(atom.keymaps.keystrokeForKeyboardEvent(e)) > -1) {
    return false
  }
  return e
}

function remotePty () {
  return withRemoteConfig(conf => {
    return new Promise((resolve, reject) => {
      let conn = new ssh.Client()
      conn.on('ready', () => {
        conn.shell({ term: "xterm-256color" }, (err, stream) => {
          if (err) console.error(`Error while starting remote shell.`)

          stream.on('close', () => {
            conn.end()
          })

          // forward resize handling
          stream.resize = (cols, rows) => stream.setWindow(rows, cols, 999, 999)

          resolve({pty: stream, cwd: '~', conf: conf})
        })
      }).connect(conf)
    })
  })
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
  forEachPane(item => item.detach(), /terminal\-julia\-\d+/)
  // remote terminals shouldn't be serialized
  forEachPane(item => {
    item.detach()
    item.close()
  }, /terminal\-remote\-julia\-\d+/)
  terminal.detach()

  if (subs) subs.dispose()
}
