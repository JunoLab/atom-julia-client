'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'

import workspace from './workspace'

let {addsourcebp, removesourcebp, getbps, loadgallium} =
  client.import(['addsourcebp', 'removesourcebp', 'getbps', 'loadgallium'])

let ink, active, stepper, subs, breakpoints

export function activate() {
  subs = new CompositeDisposable()

  subs.add(client.onDetached(() => {
    debugmode(false)
    clearbps()
  }))
}

export function deactivate() {
  breakpoints.destroy()
  subs.dispose()
}

function activeError() {
  if (!active) {
    atom.notifications.addError('You need to be debugging to do that.', {
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

client.handle({
  debugmode,
  stepto(file, line, text) {
    stepper.goto(file, line - 1)
    stepper.setText(views.render(text))
    workspace.update()
  },
  working() { client.ipc.loading.working() },
  doneWorking() { client.ipc.loading.done() }
})

export function finish()   { requireDebugging(() => client.import('finish')()) }
export function nextline() { requireDebugging(() => client.import('nextline')()) }
export function stepexpr() { requireDebugging(() => client.import('stepexpr')()) }
export function stepin()   { requireDebugging(() => client.import('stepin')()) }

function bufferForFile(file) {
  for (let ed of atom.workspace.getTextEditors()) {
    if (ed.getBuffer().getPath() === file)
      return ed.getBuffer()
  }
  return
}

function bp(file, line) {
  client.require(async () => {
    let bp = breakpoints.toggle(file, line)
    try {
      await loadgallium()
      let response = await ((bp ? addsourcebp : removesourcebp)(file, line+1))
    } catch (e) {
      console.error('Setting breakpoint:', e)
      breakpoints.toggle(file, line)
    }
  })
}

export function clearbps() {
  breakpoints.clear()
  if (client.isActive()) client.import('clearbps')()
}

export function getBPs() {
  console.log(getbps())
}

export function togglebp(ed = atom.workspace.getActiveTextEditor()) {
  if (!ed || !ed.getPath()) {
    atom.notifications.addError('Need a saved file to add a breakpoint')
    return
  }
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
  breakpoints = new ink.breakpoints('source.julia')
}
