'use babel'
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import { views } from '../ui'
import { client } from '../connection'

import workspace from './workspace'

let {nextline, stepin, finish, stepexpr, clearbps} =
  client.import(['nextline', 'stepin', 'finish', 'stepexpr', 'clearbps'])

let {addsourcebp, removesourcebp, getbps, loadgallium} =
  client.import({rpc: ['addsourcebp', 'removesourcebp', 'getbps', 'loadgallium']})

let ink, active, stepper, subs, BreakpointRegistry

export function activate() {
  subs = new CompositeDisposable()

  client.handle({
    debugmode: state => debugmode(state),
    stepto: (file, line, text) => stepto(file, line, text)
  })

  subs.add(client.onDetached(() => debugmode(false)))

  startListening()

  client.onDetached(() => clearall())
}

export function deactivate() {
  BreakpointRegistry.destroy()
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

export function nextline() { requireDebugging(() => nextline()) }
export function stepin()   { requireDebugging(() => stepin()) }
export function finish()   { requireDebugging(() => finish()) }
export function stepexpr() { requireDebugging(() => stepexpr()) }

let breakpoints = []

// logic for activating breakpoints for saved files and deactivating when
// they are modified
function startListening() {
  subs.add(atom.workspace.observeTextEditors(ed => {
    subs.add(ed.observeGrammar(g => {
      if (g.scopeName === 'source.julia') {
        let buffer = ed.getBuffer()
        buffer.onDidChangeModified(m => {
          let file = buffer.getPath()
          // unsaved changes in buffer -> deactivate all breakpoints
          if (m === true) {
            forBPinFile(file, bp => {
              // clear the breakpoints in gallium
              removesourcebp(bp.file, bp.line + 1).then(r => {
                if (r.msg !== 'bpremoved')
                  console.error(r.msg)
                // and set them to inactive in atom
                bp.updateLineToMarkerPosition()
                bp.origStatus = bp.status
                bp.status = 'inactive'
              })
            })
          } else {
            forBPinFile(file, bp => {
              bp.updateLineToMarkerPosition()
              // set breakpoints in gallium
              addsourcebp(bp.file, bp.line + 1).then(r => {
                if (r.msg !== 'bpset')
                  console.error(r.msg)
                // reset status
                if (bp.origStatus)
                  bp.status = bp.origStatus
              })
            })
          }
        })
      }
    }))
  }))
}

function forBPinFile(file, f) {
  for (let bp of breakpoints) {
    if (bp.file === file)
      f(bp)
  }
}

function bufferForFile(file) {
  for (let ed of atom.workspace.getTextEditors()) {
    if (ed.getBuffer().getPath() === file)
      return ed.getBuffer()
  }
  return null
}

function bp(file, line) {
  loadgallium().then(() => {
    let i = breakpoints.findIndex(bp => bp.file === file && bp.line === line)

    if (!bufferForFile(file))
      return

    let modified = bufferForFile(file).isModified()

    if (i > -1) {
      let bp = breakpoints[i]
      breakpoints.splice(i, 1)

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
          breakpoints.push(BreakpointRegistry.add(file, line, 'active'))
        })
      }
    }
  })
}

export function clearall() {
  breakpoints.forEach((bp) => bp.destroy())
  breakpoints = []
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
