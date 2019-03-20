'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'
import connection from '../connection'

import workspace from './workspace'

let {addsourcebp, removesourcebp, getbps} =
  client.import(['addsourcebp', 'removesourcebp', 'getbps'])

let ink, active, stepper, subs, breakpoints, debuggerPane

export function activate (i) {
  ink = i

  let buttons = [
    {icon: 'link-external', tooltip: 'Debug: Finish Function', command: 'julia-debug:finish-function'},
    {icon: 'arrow-down', tooltip: 'Debug: Next Line', command: 'julia-debug:step-to-next-line'},
    {icon: 'jump-down', tooltip: 'Debug: Step to Selected Line', command: 'julia-debug:step-to-selected-line'},
    {icon: 'triangle-right', tooltip: 'Debug: Next Expression', command: 'julia-debug:step-to-next-expression'},
    {icon: 'sign-in', tooltip: 'Debug: Step into Function', command: 'julia-debug:step-into-function'},
    {icon: 'x', tooltip: 'Debug: Stop Debugging', command: 'julia-debug:stop-debugging'}
  ]
  stepper = new ink.Stepper({
    buttons: buttons,
    pending: !atom.config.get('julia-client.uiOptions.openNewEditorWhenDebugging')
  })
  breakpoints = new ink.breakpoints('source.julia', {
    toggle: toggleJuliaBP,
    clear: clearJulia,
    toggleUncaught: toggleUncaughtJulia,
    toggleException: toggleExceptionJulia,
    refresh: getBreakpoints,
    addArgs: addArgsJulia,
    toggleActive: toggleActiveJulia,
    toggleAllActive: toggleAllActiveJulia
  })
  debuggerPane = ink.DebuggerPane.fromId('julia-debugger-pane', stepper, breakpoints, buttons)

  subs = new CompositeDisposable()

  subs.add(client.onDetached(() => {
    debugmode(false)
    breakpoints.clear()
  }))
}

export function deactivate() {
  breakpoints.destroy()
  subs.dispose()
}

export function openPane () {
  debuggerPane.open()
}

function activeError() {
  if (!active) {
    atom.notifications.addError('You need to be debugging to do that.', {
      detail: 'You can start debugging by calling `@enter f(args...)`.',
      dismissable: true
    })
    return true
  }
}

function requireDebugging(f) { activeError() || f() }

function debugmode(a) {
  active = a
  if (!active) {
    stepper.destroy()
    workspace.update()
    debuggerPane.reset()
  } else {
    debuggerPane.open()
  }
}

client.handle({
  debugmode,
  stepto(file, line, text, moreinfo) {
    console.log(moreinfo);
    console.log(views);
    // if (moreinfo.code) {
    //   code = views.code(moreinfo.code)
    //   console.log(code);
    //   moreinfo.code = code
    // }

    stepper.step(file, line - 1, views.render(text), moreinfo)
    workspace.update()
  },
  working() { client.ipc.loading.working() },
  doneWorking() { client.ipc.loading.done() }
})

export function finish()   { requireDebugging(() => client.import('finish')()) }
export function nextline() { requireDebugging(() => client.import('nextline')()) }
export function stepexpr() { requireDebugging(() => client.import('stepexpr')()) }
export function stepin()   { requireDebugging(() => client.import('stepin')()) }
export function stop()     { requireDebugging(() => client.import('stop')()) }
export function toselectedline() {
  requireDebugging(() => {
    let ed = stepper.edForFile(stepper.file)
    if (ed != null) {
      client.import('toline')(ed.getCursorBufferPosition().row + 1)
    }
  })
}

function bufferForFile(file) {
  for (let ed of atom.workspace.getTextEditors()) {
    if (ed.getBuffer().getPath() === file)
      return ed.getBuffer()
  }
  return
}

export function clearbps() {
  connection.boot()
  breakpoints.clear()
  if (client.isActive()) client.import('clearbps')()
}

function toggleJuliaBP (file, line) {
  connection.boot()
  return client.import('toggleBP')(file, line)
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
function toggleActiveJulia (file, line) {
  connection.boot()
  return client.import('toggleActiveBP')(file, line)
}

export function togglebp(ed = atom.workspace.getActiveTextEditor()) {
  if (!ed || !ed.getPath()) {
    atom.notifications.addError('Need a saved file to add a breakpoint')
    return
  }
  ed.getCursors().map((cursor) =>
    breakpoints.tryToggle(ed.getPath(), cursor.getBufferPosition().row))
}
