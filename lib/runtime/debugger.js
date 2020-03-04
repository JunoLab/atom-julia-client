'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'
import connection from '../connection'
import { blocks, cells, paths } from '../misc'
import modules from './modules'

import workspace from './workspace'

const { debugfile, module: getmodule } = client.import(['debugfile', 'module'])

let active, stepper, subs, breakpoints, debuggerPane, ink

const buttonSVGs = {
  'step-in': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
        <line x1="33.33" y1="20" x2="73.33" y2="20" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="33.33" y1="33.33" x2="73.33" y2="33.33" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="53.33" y1="46.67" x2="73.33" y2="46.67" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polyline points="20 13.33 20 53.33 33.11 53.33" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="29.61 65.3 50.33 53.34 29.61 41.37 29.61 65.3" style="fill:var(--color)"/>
        <line x1="53.33" y1="60" x2="73.33" y2="60" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
    </svg>
  `,
  'step-out': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
        <line x1="40" y1="46.67" x2="73.33" y2="46.67" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="40" y1="60" x2="73.33" y2="60" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="53.33" y1="20" x2="73.33" y2="20" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polyline points="46.67 26.67 20 26.67 20 49.45" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="8.03 45.94 20 66.67 31.97 45.94 8.03 45.94" style="fill:var(--color)"/>
        <line x1="53.33" y1="33.33" x2="73.33" y2="33.33" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
    </svg>
  `,
  'step-to-selection': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
        <line x1="40" y1="20" x2="73.33" y2="20" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="40" y1="33.33" x2="73.33" y2="33.33" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="20" y1="13.33" x2="20" y2="49.44" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="8.03 45.94 20 66.67 31.97 45.94 8.03 45.94" style="fill:var(--color)"/>
        <line x1="40" y1="46.67" x2="73.33" y2="46.67" style="fill:none;stroke:var(--color-highlight);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="20" y1="13.33" x2="20" y2="49.44" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="8.03 45.94 20 66.67 31.97 45.94 8.03 45.94" style="fill:var(--color)"/>
        <line x1="73.33" y1="60" x2="40" y2="60" style="fill:none;stroke:var(--color-subtle);stroke-miterlimit:10;stroke-width:8px"/>
    </svg>
  `,
  'step-line': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
        <line x1="40" y1="20" x2="73.33" y2="20" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="40" y1="33.33" x2="73.33" y2="33.33" style="fill:none;stroke:var(--color-subtle);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="40" y1="46.67" x2="73.33" y2="46.67" style="fill:none;stroke:var(--color-subtle);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="20" y1="13.33" x2="20" y2="49.44" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="8.03 45.94 20 66.67 31.97 45.94 8.03 45.94" style="fill:var(--color)"/>
        <line x1="40" y1="60" x2="73.33" y2="60" style="fill:none;stroke:var(--color-subtle);stroke-miterlimit:10;stroke-width:8px"/>
        <line x1="20" y1="13.33" x2="20" y2="49.44" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="8.03 45.94 20 66.67 31.97 45.94 8.03 45.94" style="fill:var(--color)"/>
    </svg>
  `,
  'step-expr': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
        <path d="M23.08,35.74V40H8.79V17.26H23.08v4.26H13.66v5.06h8.87V30.5H13.66v5.25Z" style="fill:var(--color)"/>
        <path d="M33.36,34.33h-.18L30.36,40H25.45l4.94-8.54-4.94-8.68h5.34l2.63,5.63h.19l2.63-5.63h5.11l-5,8.53,5,8.7H36.22Z" style="fill:var(--color)"/>
        <path d="M53.35,22.54a5.62,5.62,0,0,1,4.79,2.34,10.78,10.78,0,0,1,1.73,6.52,10.86,10.86,0,0,1-1.71,6.5,6,6,0,0,1-7.74,1.55,4.77,4.77,0,0,1-1.88-2.22h-.18v8.42H43.67V22.77h4.61v2.9h.18a5.05,5.05,0,0,1,1.93-2.3A5.36,5.36,0,0,1,53.35,22.54Zm-1.66,13.7a2.85,2.85,0,0,0,2.46-1.29,6.09,6.09,0,0,0,.91-3.55,6.14,6.14,0,0,0-.91-3.55,3,3,0,0,0-4.91,0,6.18,6.18,0,0,0-.93,3.54,6.17,6.17,0,0,0,.92,3.54A2.84,2.84,0,0,0,51.69,36.23Z" style="fill:var(--color)"/>
        <path d="M62.63,40V22.77h4.55v3h.19a4.3,4.3,0,0,1,1.41-2.35,3.82,3.82,0,0,1,2.52-.87,4.63,4.63,0,0,1,1.52.2v4.37A4.77,4.77,0,0,0,71,26.82a3.5,3.5,0,0,0-2.66,1,3.89,3.89,0,0,0-1,2.81V40Z" style="fill:var(--color)"/>
        <polyline points="6.67 60 33.33 60 56.69 60" style="fill:none;stroke:var(--color);stroke-miterlimit:10;stroke-width:8px"/>
        <polygon points="53.3 71.57 73.33 60 53.3 48.43 53.3 71.57" style="fill:var(--color)"/>
    </svg>
  `
}

export function activate (_ink) {
  ink = _ink
  const buttons = [
    {icon: 'playback-fast-forward', tooltip: 'Debug: Continue', command: 'julia-debug:continue', color: 'success'},
    {tooltip: 'Debug: Next Line', command: 'julia-debug:step-to-next-line', svg: buttonSVGs['step-line']},
    {tooltip: 'Debug: Step to Selected Line', command: 'julia-debug:step-to-selected-line', svg: buttonSVGs['step-to-selection']},
    {tooltip: 'Debug: Next Expression', command: 'julia-debug:step-to-next-expression', svg: buttonSVGs['step-expr']},
    {tooltip: 'Debug: Step Into', command: 'julia-debug:step-into', svg: buttonSVGs['step-in']},
    {tooltip: 'Debug: Step Out', command: 'julia-debug:step-out', svg: buttonSVGs['step-out']},
    {icon: 'x', tooltip: 'Debug: Stop Debugging', command: 'julia-debug:stop-debugging', color: 'error'},
  ]
  const startButtons = [
    {text: 'Run File', tooltip: 'Debug: Run File', command: 'julia-debug:run-file'},
    {text: 'Step Through File', tooltip: 'Debug: Step Through File', command: 'julia-debug:step-through-file'},
    {text: 'Run Block', tooltip: 'Debug: Run Block', command: 'julia-debug:run-block'},
    {text: 'Step Through Block', tooltip: 'Debug: Step Through Block', command: 'julia-debug:step-through-block'},
  ]
  stepper = new ink.Stepper({
    buttons: buttons,
    pending: !atom.config.get('julia-client.uiOptions.openNewEditorWhenDebugging')
  })
  breakpoints = new ink.breakpoints(atom.config.get('julia-client.juliaSyntaxScopes'), {
    toggle: toggleJuliaBP,
    clear: clearJulia,
    toggleUncaught: toggleUncaughtJulia,
    toggleException: toggleExceptionJulia,
    refresh: getBreakpoints,
    addArgs: addArgsJulia,
    toggleActive: toggleActiveJulia,
    toggleAllActive: toggleAllActiveJulia,
    addCondition: addCondition,
    setLevel: setLevel,
    toggleCompiled: toggleCompiled
  })
  debuggerPane = ink.DebuggerPane.fromId('julia-debugger-pane', stepper, breakpoints, buttons, startButtons)

  subs = new CompositeDisposable()
  subs.add(atom.config.observe('julia-client.uiOptions.layouts.debuggerPane.defaultLocation', (defaultLocation) => {
    debuggerPane.setDefaultLocation(defaultLocation)
  }))
  subs.add(client.onDetached(() => {
    debugmode(false)
    breakpoints.clear(true)
  }))
}

export function deactivate() {
  breakpoints.destroy()
  subs.dispose()
}

export function open () {
  return debuggerPane.open({
    split: atom.config.get('julia-client.uiOptions.layouts.debuggerPane.split')
  })
}

export function close () {
  return debuggerPane.close()
}

function activeError(ev) {
  if (!active) {
    // Only show an error when toolbar button or command is used directly. `ev.originalEvent` is
    // a `KeyboardEvent` if this was triggered by a keystroke.
    if (ev.originalEvent === undefined) {
      atom.notifications.addError('You need to be debugging to do that.', {
        description: 'You can start debugging by calling `Juno.@enter f(args...)` from the integrated REPL.',
        dismissable: true
      })
    }
    return true
  }
  return false
}

function requireDebugging(ev, f) {
  if (activeError(ev)) {
    ev.abortKeyBinding()
  } else {
    f()
  }
}

function requireNotDebugging(f) {
  if (active) {
    atom.notifications.addError('Can\'t start a debugging session while debugging.', {
      description: 'Please finish the current session first.',
      dismissable: true
    })
  } else {
    f()
  }
}

function debugmode(a) {
  active = a
  if (!active) {
    stepper.destroy()
    workspace.update()
    debuggerPane.reset()
  } else {
    debuggerPane.ensureVisible()
  }
}

client.handle({
  debugmode,
  stepto(file, line, text, moreinfo) {
    stepper.step(file, line - 1, views.render(text), moreinfo)
    workspace.update()
  },
  working() { client.ipc.loading.working() },
  doneWorking() { client.ipc.loading.done() },
  getFileBreakpoints() {
    const bps = breakpoints.getFileBreakpoints()
    return bps.filter(bp => bp.isactive).map(bp => {
      return {
        file: bp.file,
        line: bp.line,
        condition: bp.condition
      }
    })
  }
})

export function finish (ev)   { requireDebugging(ev, () => client.import('finish')()) }
export function nextline (ev) { requireDebugging(ev, () => client.import('nextline')()) }
export function stepexpr (ev) { requireDebugging(ev, () => client.import('stepexpr')()) }
export function stepin (ev)   { requireDebugging(ev, () => client.import('stepin')()) }
export function stop (ev)     { requireDebugging(ev, () => client.import('stop')()) }
export function continueForward (ev) { requireDebugging(ev, () => client.import('continue')()) }
export function toselectedline (ev) {
  requireDebugging(ev, () => {
    const ed = stepper.edForFile(stepper.file)
    if (ed != null) {
      client.import('toline')(ed.getCursorBufferPosition().row + 1)
    }
  })
}

export function debugFile(shouldStep, el) {
  requireNotDebugging(() => {
    if (el) {
      const path = paths.getPathFromTreeView(el)
      if (!path) {
        atom.notifications.addError('This file has no path.')
        return
      }
      try {
        const code = paths.readCode(path)
        const data = { path, code, row: 1, column: 1 }
        getmodule(data).then(mod => {
          debugfile(modules.current(mod), code, path, shouldStep)
        }).catch(err => {
          console.log(err)
        })
      } catch (err) {
        atom.notifications.addError('Error happened', {
          detail: err,
          dismissable: true
        })
      }
    } else {
      const ed = atom.workspace.getActiveTextEditor()
      if (!(ed && ed.getGrammar && ed.getGrammar().id === 'source.julia')) {
        atom.notifications.addError('Can\'t debug current file.', {
          description: 'Please make sure a Julia file is open in the workspace.'
        })
        return
      }
      const edpath = client.editorPath(ed) || 'untitled-' + ed.getBuffer().id
      const mod = modules.current() || 'Main'
      debugfile(mod, ed.getText(), edpath, shouldStep)
    }
  })
}

export function debugBlock(shouldStep, cell) {
  requireNotDebugging(() => {
    const ed = atom.workspace.getActiveTextEditor()
    if (!ed) {
      atom.notifications.addError('Can\'t debug current code block.', {
        description: 'Please make sure a file is open in the workspace.'
      })
      return
    }
    const edpath = client.editorPath(ed) || 'untitled-' + ed.getBuffer().id
    const mod = modules.current() || 'Main'
    const selector = cell ? cells : blocks
    const blks = selector.get(ed)
    if (blks.length === 0) {
      return
    }
    const { range, text, line } = blks[0]
    const [[start], [end]] = range
    ink.highlight(ed, start, end)
    debugfile(mod, text, edpath, shouldStep, line)
  })
}

export function clearbps() {
  connection.boot()
  breakpoints.clear()
  if (client.isActive()) client.import('clearbps')()
}

function toggleJuliaBP (item) {
  connection.boot()
  return client.import('toggleBP')(item)
}
function clearJulia () {
  connection.boot()
  return client.import('clearbps')()
}
function toggleUncaughtJulia () {
  connection.boot()
  return client.import('toggleUncaught')()
}
function toggleExceptionJulia () {
  connection.boot()
  return client.import('toggleException')()
}
function toggleCompiled () {
  connection.boot()
  return client.import('toggleCompiled')()
}
function getBreakpoints () {
  connection.boot()
  return client.import('getBreakpoints')()
}
function addArgsJulia (args) {
  connection.boot()
  return client.import('addArgs')(args)
}
function toggleAllActiveJulia (args) {
  connection.boot()
  return client.import('toggleAllActiveBP')(args)
}
function toggleActiveJulia (item) {
  connection.boot()
  return client.import('toggleActiveBP')(item)
}
function addCondition (item, cond) {
  connection.boot()
  return client.import('addConditionById')(item, cond)
}
function setLevel (level) {
  connection.boot()
  return client.import('setStackLevel')(level)
}

export function togglebp (
  cond = false,
  ed = atom.workspace.getActiveTextEditor()
) {
  if (!ed || !ed.getPath()) {
    atom.notifications.addError('Need a saved file to add a breakpoint')
    return
  }
  const file = client.editorPath(ed)
  ed.getCursors().map((cursor) => {
    const line = cursor.getBufferPosition().row + 1
    if (cond) {
      breakpoints.toggleConditionAtSourceLocation({
        file: file,
        line: line
      })
    } else {
      breakpoints.toggleAtSourceLocation({
        file: file,
        line: line
      })
    }
  })
}
