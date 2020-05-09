'use babel'

import { client } from '../connection'
import { customEnv } from '../connection/process/basic'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import evaluation from './evaluation'
import modules from './modules'
import * as pty from 'node-pty-prebuilt-multiarch'
import { debounce } from 'underscore-plus'
import { selector } from '../ui'
import { withRemoteConfig } from '../connection/process/remote'
import * as ssh from 'ssh2'

const { changeprompt, changemodule, fullpath } =
  client.import({ msg: ['changeprompt', 'changemodule'], rpc: ['fullpath'] })

const isWindows = process.platform === 'win32'
const uriRegex = isWindows ?
  /(@ ([^\s]+)\s(.*?)\:(\d+)|((([a-zA-Z]:|\.\.?|\~)|([^\0<>\?\|\/\s!$`&*()\[\]+'":;])+)?((\\|\/)([^\0<>\?\|\/\n\r!$`&*()\[\]+'":;])+)+(\.|\\|\/)[^\0<>\?\|\/\s!$`&*()\[\]+'":;]+)(\:\d+)?)/ :
  /(@ ([^\s]+)\s(.*?)\:(\d+)|(((\.\.?|\~)|([^\0\s!$`&*()\[\]+'":;\\])+)?(\/([^\0\n\r!$`&*()\[\]+'":;\\])+)+(\.|\/)[^\0\s!$`&*()\[\]+'":;\\]+)(\:\d+)?)/

var whitelistedKeybindingsREPL = []
var whitelistedKeybindingsTerminal = []
var ink = undefined
let subs = undefined

export var terminal

export function activate (_ink) {
  ink = _ink
  subs = new CompositeDisposable()

  process.env['TERM'] = 'xterm-256color'

  subs.add(
    atom.config.observe('julia-client.consoleOptions.whitelistedKeybindingsREPL', (kbds) => {
      whitelistedKeybindingsREPL = kbds.map(s => s.toLowerCase())
    }),
    atom.config.observe('julia-client.consoleOptions.whitelistedKeybindingsTerminal', (kbds) => {
      whitelistedKeybindingsTerminal = kbds.map(s => s.toLowerCase())
    }),
    atom.config.observe('julia-client.consoleOptions.cursorStyle', updateTerminalSettings),
    atom.config.observe('julia-client.consoleOptions.maximumConsoleSize', updateTerminalSettings),
    atom.config.observe('julia-client.consoleOptions.macOptionIsMeta', updateTerminalSettings),
    atom.config.observe('julia-client.consoleOptions.terminalRendererType', updateTerminalSettings),
    atom.config.observe('julia-client.consoleOptions.cursorBlink', updateTerminalSettings)
  )

  terminal = ink.InkTerminal.fromId('julia-terminal', terminalOptions())
  terminal.setTitle('REPL', true)
  terminal.onDidOpenLink(hasKeyboardModifier)
  terminal.registerTooltipHandler(showTooltip, hideTooltip)
  terminal.class = 'julia-terminal'

  subs.add(atom.config.observe('julia-client.uiOptions.layouts.console.defaultLocation', (defaultLocation) => {
    terminal.setDefaultLocation(defaultLocation)
  }))

  terminal.write('\x1b[1m\x1b[32mPress Enter to start Julia. \x1b[0m\n\r')
  terminal.startRequested = () => {
    client.boot()
  }

  terminal.attachCustomKeyEventHandler((e) => handleKeybinding(e, terminal, whitelistedKeybindingsREPL))

  modules.onDidChange(debounce(() => changemodule({mod: modules.current()}), 200))

  client.handle({
    clearconsole: () => terminal.clear(),
    cursorpos: () => terminal.cursorPosition(),
    writeToTerminal: (str) => {
      if (terminal.ty) {
        terminal.ty.write(str)
        return true
      }
      return false
    }
  })

  let promptObserver
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

    addLinkHandler(terminal.terminal)
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
    terminal.write('\n\r\x1b[1m\r\x1b[31mJulia has exited.\n\r\x1b[32mPress Enter to start a new session.\x1b[0m\n\r')
    if (promptObserver) promptObserver.dispose()
  })

  subs.add(
    // repl commands
    atom.commands.add('atom-workspace', {
      'julia-client:open-REPL': () => {
        open().then(() => terminal.show())
      },
      'julia-client:clear-REPL': () => {
        terminal.clear()
      },
    }),
    atom.commands.add('.julia-terminal', {
      'julia-client:copy-or-interrupt': () => {
        if (!terminal.copySelection()) {
          atom.commands.dispatch(terminal.view, 'julia-client:interrupt-julia')
        }
      }
    }),
    // terminal commands
    atom.commands.add('atom-workspace', {
      'julia-client:new-terminal': () => {
        newTerminal()
      },
      'julia-client:new-terminal-from-current-folder': ev => {
        const dir = evaluation.currentDir(ev.target)
        if (!dir) return
        newTerminal(dir)
      },
      'julia-client:new-remote-terminal': () => {
        newRemoteTerminal()
      }
    })
  )

  // handle deserialized terminals
  forEachPane(item => {
    if (!item.ty) {
      item.attachCustomKeyEventHandler((e) => handleKeybinding(e, item))
      addLinkHandler(item.terminal)
      item.onDidOpenLink(hasKeyboardModifier)
      item.registerTooltipHandler(showTooltip, hideTooltip)
      shellPty(item.persistentState.cwd)
        .then(({pty, cwd}) => item.attach(pty, true, cwd))
        .catch(() => {})
    }
  }, /terminal\-julia\-\d+/)
  forEachPane(item => item.close(), /terminal\-remote\-julia\-\d+/)
}

export function open () {
  return terminal.open({
    split: atom.config.get('julia-client.uiOptions.layouts.console.split')
  })
}

export function close () {
  return terminal.close()
}

function newTerminal (cwd) {
  const term = ink.InkTerminal.fromId(`terminal-julia-${Math.floor(Math.random()*10000000)}`, terminalOptions())
  term.attachCustomKeyEventHandler((e) => handleKeybinding(e, term))
  term.onDidOpenLink(hasKeyboardModifier)
  term.registerTooltipHandler(showTooltip, hideTooltip)
  addLinkHandler(term.terminal)
  shellPty(cwd).then(({pty, cwd}) => {
    term.attach(pty, true, cwd)
    term.setDefaultLocation(atom.config.get('julia-client.uiOptions.layouts.terminal.defaultLocation'))
    term.open({
      split: atom.config.get('julia-client.uiOptions.layouts.terminal.split')
    }).then(() => term.show()).catch(err => {
      console.log(err)
    })
  }).catch(() => {})
}

function newRemoteTerminal () {
  const term = ink.InkTerminal.fromId(`terminal-remote-julia-${Math.floor(Math.random()*10000000)}`, terminalOptions())
  term.attachCustomKeyEventHandler((e) => handleKeybinding(e, term))
  term.onDidOpenLink(hasKeyboardModifier)
  term.registerTooltipHandler(showTooltip, hideTooltip)
  addLinkHandler(term.terminal)
  remotePty().then(({pty, cwd, conf}) => {
    term.attach(pty, true, cwd)
    term.setTitle(`Terminal @ ${conf.name}`)
    term.setDefaultLocation(atom.config.get('julia-client.uiOptions.layouts.terminal.defaultLocation'))
    term.open({
      split: atom.config.get('julia-client.uiOptions.layouts.terminal.split')
    }).then(() => term.show())
    pty.on('close', () => term.detach())
  }).catch((e) => console.error(e))
}

function terminalOptions () {
  const opts = {
    scrollback: atom.config.get('julia-client.consoleOptions.maximumConsoleSize'),
    cursorStyle: atom.config.get('julia-client.consoleOptions.cursorStyle'),
    rendererType: atom.config.get('julia-client.consoleOptions.terminalRendererType'),
    cursorBlink: atom.config.get('julia-client.consoleOptions.cursorBlink')
  }
  if (process.platform === 'darwin') {
    opts.macOptionIsMeta = atom.config.get('julia-client.consoleOptions.macOptionIsMeta')
  }
  return opts
}

function updateTerminalSettings () {
  const settings = terminalOptions()
  forEachPane((item) => {
    for (const key in settings) {
      item.setOption(key, settings[key])
    }
  }, /terminal\-julia\-\d+|julia\-terminal|terminal\-remote\-julia\-\d+/)
}

function forEachPane (f, id = /terminal\-julia\-\d+/) {
  atom.workspace.getPaneItems().forEach((item) => {
    if (item.id && item.name === 'InkTerminal' && item.id.match(id)) {
      f(item)
    }
  })
}

function hasKeyboardModifier (event) {
  if (atom.config.get('julia-client.consoleOptions.linkModifier')) {
    return process.platform == 'darwin' ? event.metaKey : event.ctrlKey
  }
  return true
}

function handleLink (event, uri) {
  if (!hasKeyboardModifier(event)) return false

  if (client.isActive()) {
    fullpath(uri).then(([path, line]) => {
      ink.Opener.open(path, line - 1, {
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    })
  } else {
    let urimatch = uri.match(/@ ([^\s]+)\s(.*?)\:(\d+)/)
    if (urimatch) {
      ink.Opener.open(urimatch[1], parseInt(urimatch[2]) - 1, {
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    } else {
      const matchregex = isWindows ?
        /(([a-zA-Z]\:)?[^\:]+)(?:\:(\d+))?/ :
        /([^\:]+)(?:\:(\d+))?/
      urimatch = uri.match(matchregex)
      if (urimatch) {
        const line = urimatch[2] !== null ? parseInt(urimatch[2]) : 0
        ink.Opener.open(urimatch[1], line - 1, {
          pending: atom.config.get('core.allowPendingPaneItems')
        })
      }
    }
  }
}

function addLinkHandler (terminal) {
  terminal.registerLinkMatcher(uriRegex, handleLink, {
    willLinkActivate: ev => hasKeyboardModifier(ev),
    tooltipCallback: (ev, uri, location) => showTooltip(ev, uri, location, terminal),
    leaveCallback: () => hideTooltip()
  })
}

let tooltip = null

function showTooltip (event, uri, location, terminal) {
  hideTooltip()

  if (atom.config.get('julia-client.consoleOptions.linkModifier')) {
    const el = document.createElement('div')
    el.classList.add('terminal-link-tooltip')

    const terminalRect = terminal.element.getBoundingClientRect()
    const colWidth = terminalRect.width / terminal.cols
    const rowHeight = terminalRect.height / terminal.rows

    const leftPosition = location.start.x * colWidth + terminalRect.left
    const topPosition = (location.start.y - 1.5) * rowHeight + terminalRect.top

    el.style.top = topPosition + 'px'
    el.style.left = leftPosition + 'px'

    el.innerText = (process.platform == 'darwin' ? 'Cmd' : 'Ctrl') + '-Click to open link.'

    tooltip = el
    document.body.appendChild(el)

    return true
  } else {
    return false
  }
}

function hideTooltip () {
  if (tooltip) {
    try {
      document.body.removeChild(tooltip)
    } catch (err) {

    } finally {
      tooltip = null
    }
  }
}

function handleKeybinding (e, term, binds = whitelistedKeybindingsTerminal) {
  if (process.platform !== 'win32' && e.keyCode === 13 && (e.altKey || e.metaKey) && e.type === 'keydown') {
    // Meta-Enter doesn't work properly with xterm.js atm, so we send the right escape sequence ourselves:
    if (term.ty) {
      term.ty.write('\x1b\x0d')
    }
    return false
  } else if (binds.indexOf(atom.keymaps.keystrokeForKeyboardEvent(e)) > -1) {
    // let certain user defined key events fall through to Atom's handler
    return false
  }
  return e
}

function remotePty () {
  return withRemoteConfig(conf => {
    return new Promise((resolve, reject) => {
      const conn = new ssh.Client()
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
  process.env['TERM'] = 'xterm-256color'
  return new Promise((resolve, reject) => {
    let pr
    if (cwd) {
      pr = new Promise((resolve) => resolve(cwd))
    } else {
      // show project paths
      pr = selector.show(atom.project.getPaths(), {
        emptyMessage: 'Enter a custom path above.',
        allowCustom: true
      })
    }
    pr.then((cwd) => {
      if (cwd) {
        cwd = paths.expandHome(cwd)
        if (!require('fs').existsSync(cwd)) {
          atom.notifications.addWarning("Path does not exist.", {
            description: "Defaulting to `HOME` for new terminal's working directory."
          })
          cwd = paths.home()
        }
        const env = customEnv()
        const ty = pty.spawn(atom.config.get("julia-client.consoleOptions.shell"), [], {
          cols: 100,
          rows: 30,
          cwd: cwd,
          env: env,
          useConpty: true,
          handleFlowControl: true
        })
        resolve({
          pty: ty,
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
  if (terminal) terminal.detach()
  if (subs) subs.dispose()
  subs = null
}
