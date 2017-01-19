'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'

import workspace from './workspace'

let {addsourcebp, removesourcebp, getbps, loadgallium, clearbps} =
  client.import(['addsourcebp', 'removesourcebp', 'getbps', 'loadgallium', 'clearbps'])

let ink, active, stepper, subs, breakpoints

export function activate() {
  subs = new CompositeDisposable()

  client.handle({
    debugmode: state => debugmode(state),
    stepto: (file, line, text) => stepto(file, line, text)
  })

  subs.add(client.onDetached(() => debugmode(false)))

  client.onDetached(() => clearall())
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

function stepto(file, line, text) {
  stepper.goto(file, line - 1)
  stepper.setText(views.render(text))
  workspace.update()
}

export function finish()   { requireDebugging(() => client.import('finish')()) }
export function nextline() { requireDebugging(() => client.import('nextline')()) }
export function stepexpr() { requireDebugging(() => client.import('stepexpr')()) }
export function stepin()   { requireDebugging(() => client.import('stepin')()) }

function bufferForFile(file) {
  for (let ed of atom.workspace.getTextEditors()) {
    if (ed.getBuffer().getPath() === file)
      return ed.getBuffer()
  }
  return null
}

function bp(file, line) {
  loadgallium().then(() => {
    let i = breakpoints.breakpoints.findIndex(bp => bp.file === file && bp.line === line)

    if (!bufferForFile(file))
      return

    let modified = bufferForFile(file).isModified()

    if (i > -1) {
      let bp = breakpoints.breakpoints[i]
      if (modified === false) {
        removesourcebp(file, line + 1).then(r => {
          if (r.msg !== 'bpremoved')
            console.error(r.msg)
          bp.destroy()
        })
      }
    } else {
      if (modified === false) {
        addsourcebp(file, line + 1).then(r => {
          if (r.msg !== 'bpset')
            console.error(r.msg)
          breakpoints.add(file, line, 'active')
        })
      }
    }
  })
}

export function clearall() {
  breakpoints.breakpoints.forEach(bp => bp.destroy())
  if (client.isActive()) clearbps()
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
  breakpoints = new ink.breakpoints('source.julia')
}
