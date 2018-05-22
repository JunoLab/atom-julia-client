'use babel'

export class IPC {
  /**
   * Constructs a class that facilitates communication with a process. Takes a
   * function `writeMsg` as its argument.
   */
  constructor (writeMsg) {
    this.handlers = {}
    this.callbacks = {}
    this.queue = []
    this.id = 0

    this.writeMsg = writeMsg

    this.handle({
      cb: (id, result) => {
        let callback = this.callbacks[id]
        if (callback) {
          callback.resolve(result)
          delete(this.callbacks[id])
        }
      },
      cancelCallback: (id, err) => {
        this.callbacks[id].reject(err)
      }
    })
  }

  /**
   * Register a handler `f` for requests of type `type`.
   * `type` can also be an object of the form
   *  {type1: function1, type2: function2} for convenience.
   */
  handle (type, f) {
    if (f === undefined) {
      for (let {t, f} of type) {
        this.handle(t, f)
      }
    } else {
      this.handlers[type] = f
    }
  }

  /**
   * Send a message to the Julia process; does not block the message queue.
   */
  msg (type, ...args) {
    this.writeMsg([type, ...args])
  }

  /**
   * Send a message to the Julia process. Returns a `Promise` that is resolved
   * once the Julia process answers or errors.
   */
  rpc (type, ...args) {
    let p = new Promise((resolve, reject) => {
      this.id += 1
      this.callbacks[this.id] = {resolve, reject}
      this.msg({type, callback: this.id}, ...args)
    })
    if (this.loading) {
      this.loading.monitor(p)
    }
    return p
  }

  /**
   * Flush the message queue.
   */
  flush () {
    this.queue.forEach((msg) => this.writeMsg(msg))
    this.queue = []
  }

  /**
   * Reset the loading indicator and the message queue. All registered callbacks
   * are rejected with 'disconnected'.
   */
  reset () {
    this.loading.reset()
    this.queue = []
    for (let {id, cb} of this.callbacks) {
      cb.reject('disconnected')
    }
    this.callbacks = {}
  }

  // input? no clue what it does though

  /**
   *
   */
  import (fs, rpc = true, mod = {}) {
    if (!fs) return
    if (fs.cunstructor === String) {
      return this.import([fs], rpc, mod)[fs]
    }
    if (!!fs.rpc || !!fs.msg) {
      mod = {}
      this.import(fs.rpc, true, mod)
      this.import(fs.msg, false, mod)
    } else {
      fs.forEach((f) => {
        mod[f] = (...args) => {
          if (rpc) {
            this.rpc(f, ...args)
          } else {
            this.msg(f, ...args)
          }
        }
      })
    }
  }

  isWorking () {
    return this.loading.isWorking()
  }

  onWorking (f) {
    return this.loading.onWorking(f)
  }

  onDone (f) {
    return this.loading.onDone(f)
  }

  onceDone (f) {
    return this.loading.onceDone(f)
  }

  errJson (obj) {
    if (!(obj instanceof Error)) {
      return
    } else {
      return {
        type: 'error',
        message: obj.message,
        stack: obj.stack
      }
    }
  }





}
