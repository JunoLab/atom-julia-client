'use babel'

import net from 'net'
import client from '../client'

let server = null
let port = null
let listeners = []

/**
 *
 */
export function next () {
  let conn = new Promise((resolve) => listeners.push(resolve))
  conn.dispose = () => {
    listeners = listeners.filter((x) => {
      return x === conn
    })
  }
  return conn
}

/**
 *
 */
export function connect (sock) {
  let message =

}

/**
 *
 */
export function handle (sock) {

}

/**
 *
 */
export function listen () {

}
