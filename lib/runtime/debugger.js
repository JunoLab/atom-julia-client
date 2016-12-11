'use babel'

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'

import workspace from './workspace'

let {nextline, stepin, finish, stepexpr} =
  client.import(['nextline', 'stepin', 'finish', 'stepexpr'])

let ink, active, stepper, subs

export function activate() {
  subs = new CompositeDisposable

  client.handle({
    debugmode: state => debugmode(state),
    stepto: (file, line, text) => stepto(file, line, text)
  })

  subs.add(client.onDetached(() => debugmode(false)))
}

export function deactivate() {
  subs.dispose()
}

function activeError() {
  if (!active) {
    atom.notifications.addError("You need to be debugging to do that.", {
      detail: 'You can start debugging by setting a breakpoint,\nor by calling `@step f(args...)`.',
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
  }
}

function stepto(file, line, text) {
  stepper.goto(file, line-1)
  stepper.setText(views.render(text))
  workspace.update()
}

export function nextline() { requireDebugging(() => nextline()) }
export function stepin()   { requireDebugging(() => stepin()) }
export function finish()   { requireDebugging(() => finish()) }
export function stepexpr() { requireDebugging(() => stepexpr()) }

let breakpoints = []

function bp(file, line) {
  let existing
  if ((existing = ink.breakpoints.get(file, line, breakpoints)[0]) != null) {
    breakpoints = breakpoints.filter(x => x !== existing)
    existing.destroy()
  } else {
    let thebp = ink.breakpoints.add(file, line)
    breakpoints.push(thebp)
  }
}

export function togglebp(ed = atom.workspace.getActiveTextEditor()) {
  if (!ed) return
  ed.getCursors().map((cursor) =>
    bp(ed.getPath(), cursor.getBufferPosition().row))
}

export function consumeInk(i) {
  ink = i
  stepper = new ink.Stepper({
    buttons: [
      {icon: 'link-external', command: 'julia-debug:finish-function'},
      {icon: 'triangle-right', command: 'julia-debug:step-to-next-expression'},
      {icon: 'sign-in', command: 'julia-debug:step-into-function'}
    ]
  })
  subs.add(ink.breakpoints.addScope('source.julia'))
}
