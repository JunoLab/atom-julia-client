'use babel'
import { Emitter } from 'atom'
import { IPC } from './ipc'

let emitter
let ipc
let conn

export function activate () {
  emitter = new Emitter()
  ipc = new IPC((msg) => writeMsg(msg))

  handle('error', (options) => {
    if (atom.config.get('julia-client.uiOptions.errorNotifications')) {
      atom.notifications.addError(options.msg, options)
    }
    console.error(options.detail)
    atom.beep()
  })

  onAttached(() => {
    import('connected')()
    args = atom.config.get('julia-client.juliaOptions.arguments')
    if (args.length > 0) {
      import('args')(args)
    }
  })
}

export function deactivate () {
  emitter.dispose()
  if (isActive) {
    detach()
  }
}

export function onAttached (cb) {
  emitter.on('attached', cb)
}

export function onDetached (cb) {
  emitter.on('detached', cb)
}

export function onceAttached (cb) {
  let disposable = onAttached((...args) => {
    disposable.dispose()
    cb.call(this, ...args)
  })
}

export function isActive () {
  return !!conn
}

export function attach (c) {
  conn = c
  if (conn.ready && conn.ready()) flush()
  emitter.emit('attached')
}

export function detach () {
  conn = undefined
  ipc.reset()
  emitter.emit('detached')
}


export function flush () {
  return ipc.flush()
}

export function isWorking () {
  return ipc.isWorking()
}

export function onWorking (f) {
  return ipc.onWorking(f)
}

export function onDone () {
  return ipc.onDone()
}

export function onceDone () {
  return ipc.onceDone()
}

export function handle (...args) {
  ipc.handle(...args)
}

export function import (...args) {
  ipc.import(...args)
}

function clientCall (name, f, ...args) {
  let cf = conn[f]
  if (!cf) {
    atom.notifications.addError(`This client doesn't support ${name}.`)
  } else {
    cf.call(conn, ...args)
  }
}

export function interrupt () {
  if (isActive()) {
    if (isWorking()) {
      clientCall('interrupts', 'interrupt')
    } else if (atom.config.get('julia-client.consoleOptions.consoleStyle') === 'REPL-based') {
      clientCall('interrupts', 'interruptREPL')
    }
  }
}

export function kill () {
  if (isActive()) {
    if (!isWorking()) {
      import('exit')().catch(() => {})
    } else {
      clientCall('the kill comand', 'kill')
    }
  }
}

/**
 * Returns an array of command line options to pass to the Julia process on startup.
 */
export function clargs () {
  let args = []
  let {precompiled, optimisationLevel, deprecationWarnings} =
    atom.config.get('julia-client.juliaOptions')
  args.push(`--depwarn=${deprecationWarnings ? 'yes' : 'no'}`)
  if (optimisationLevel != 2) args.push(`-O${optimisationLevel}`)
  args.push('-i')

  let startupArgs = atom.config.get('julia-client.juliaOptions.startupArguments')
  if (startupArgs.length > 0) args.push(startupArgs)
  return args
}

function connectedError (action = 'do that') {
  if (isActive()) {
    atom.notifications.addError(`Can't ${action} with a Julia client running.`,
      {detail: 'Stop the current client with Packages → Julia → Stop Julia.'})
    return true
  } else {
    return false
  }
}

function notConnectedError (action = 'do that') {
  if (!isActive()) {
    atom.notifications.addError(`Can't ${action} without a Julia client running.`,
      {detail: 'Start Julia using Packages → Julia → Stop Julia.'})
    return true
  } else {
    return false
  }
}

export function require (a, f) {
  if (!f) [a, f] = [null, a]
  notConnectedError(a) || f()
}

export function disrequire (a, f) {
  if (!f) [a, f] = [null, a]
  connectedError(a) || f()
}

export function withCurrent (f) {
  let curr = conn
  return (...args) => {
    if (curr == conn) {
      f(...args)
    }
  }
}

function writeMsg (msg) {
  if (isActive() && conn.ready && conn.ready()) {
    conn.message(msg)
  } else {
    ipc.queue.push(msg)
  }
}
