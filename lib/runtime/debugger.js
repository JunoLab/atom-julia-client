'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'

import workspace from './workspace'

let {nextline, stepin, finish, stepexpr, clearbps} =
  client.import(['nextline', 'stepin', 'finish', 'stepexpr', 'clearbps'])

let {togglebp, getbps} = client.import({rpc: ['togglebp', 'getbps']})

let ink, active, stepper, subs, BreakpointRegistry

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
  togglebp(file, line+1).then((r) => {
    if (r.msg === 'bpset') {
      breakpoints.push(BreakpointRegistry.add(file, line))
    } else if (r.msg === 'bpremoved'){
      let i
      if ((i = breakpoints.findIndex(bp => bp.file === file && bp.line === line)) > -1) {
        let bp = breakpoints[i]
        breakpoints.splice(i, 1)
        bp.destroy()
      }
    }
  })
}

export function clearall() {
  breakpoints.forEach((bp) => bp.destroy())
  clearbps()
}

export function getBPs() {
  console.log(getbps())
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
  BreakpointRegistry = new ink.breakpoints('source.julia')
}
