'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'
import connection from '../connection'
import { blocks, cells } from '../misc'
import modules from './modules'

import workspace from './workspace'

const debugfile = client.import('debugfile')

let active, stepper, subs, breakpoints, debuggerPane, ink

export function activate (_ink) {
  ink = _ink
  const buttons = [
    {icon: 'playback-fast-forward', tooltip: 'Debug: Continue', command: 'julia-debug:continue', color: 'success'},
    {icon: 'triangle-down', tooltip: 'Debug: Next Line', command: 'julia-debug:step-to-next-line'},
    {icon: 'jump-down', tooltip: 'Debug: Step to Selected Line', command: 'julia-debug:step-to-selected-line'},
    {icon: 'triangle-right', tooltip: 'Debug: Next Expression', command: 'julia-debug:step-to-next-expression'},
    {icon: 'alignment-align', tooltip: 'Debug: Step Into', command: 'julia-debug:step-into'},
    {icon: 'alignment-aligned-to', tooltip: 'Debug: Step Out', command: 'julia-debug:step-out'},
    {icon: 'x', tooltip: 'Debug: Stop Debugging', command: 'julia-debug:stop-debugging', color: 'error'},
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
  debuggerPane = ink.DebuggerPane.fromId('julia-debugger-pane', stepper, breakpoints, buttons)

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
export function debugFile(shouldStep) {
  requireNotDebugging(() => {
    const ed = atom.workspace.getActiveTextEditor()
    if (!ed) {
      atom.notifications.addError('Julia Debug', {
        description: 'No currently active editor found.'
      })
      return
    }
    const edpath = client.editorPath(ed) || 'untitled-' + ed.getBuffer().id
    const mod = modules.current() || 'Main'
    debugfile(mod, ed.getText(), edpath, shouldStep)
  })
}

export function debugBlock(shouldStep, cell) {
  requireNotDebugging(() => {
    const ed = atom.workspace.getActiveTextEditor()
    if (!ed) {
      atom.notifications.addError('Julia Debug', {
        description: 'No currently active editor found.'
      })
      return
    }
    const edpath = client.editorPath(ed) || 'untitled-' + ed.getBuffer().id
    const mod = modules.current() || 'Main'
    const selector = cell ? cells : blocks
    const blks = selector.get(ed)
    if (blks.length === 0) {
      atom.notifications.addError('Julia Debug', {
        description: 'No code block found.'
      })
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
