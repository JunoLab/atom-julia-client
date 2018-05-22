'use babel'

import { time } from './misc'

function metrics () {
  let id = localStorage.getItem('metrics.userId')
  if (id) {
    r = require('http').get(`http://data.junolab.org/hit?id=${id}&app=atom-julia-boot`)
    r.on('error', () => {})
  }
}

export const IPC = require('./connection2/ipc')
export const messages = require('./connection2/messages')
export const client = require('./connection2/client')
export const local = require('./connection2/local')
export const terminal = require('./connection2/terminal')

export function activate () {
  messages.activate()
  client.activate()
  client.boot = () => boot()
  local.activate()
}

export function deactivate () {
  client.deactivate()
}

export function consumeInk (ink) {
  IPC.consumeInk(ink)
}

export function consumeTerminal (term) {
  terminal.consumeTerminal(term)
}

export function boot () {
  if (!client.isActive()) {
    local.start()
    time('Julia Boot', client.import('ping')().then(() => metrics()))
  }
}
