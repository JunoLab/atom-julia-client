{debounce} = require 'underscore-plus'

module.exports =
  paths:   require './misc/paths'
  blocks:  require './misc/blocks'
  cells:   require './misc/cells'
  words:   require './misc/words'
  weave:   require './misc/weave'
  colors:  require './misc/colors'
  scopes:  require './misc/scopes'

  bufferLines: (t, f) ->
    if not f? then [t, f] = [null, t]
    buffer = ['']
    flush = if not t? then -> else debounce (->
      if buffer[0] isnt ''
        f buffer[0], false
        buffer[0] = ''), t
    (data) ->
      lines = data.toString().split '\n'
      buffer[0] += lines.shift()
      buffer.push lines...
      while buffer.length > 1
        f buffer.shift(), true
      flush()

  time: (desc, p) ->
    s = -> new Date().getTime()/1000
    t = s()
    p.then -> console.log "#{desc}: #{(s()-t).toFixed(2)}s"
      .catch ->
    p

  hook: (obj, method, f) ->
    souper = obj[method].bind obj
    obj[method] = (a...) -> f souper, a...

  once: (f) ->
    done = false
    (args...) ->
      return if done
      done = true
      f.call @, args...

  mutex: ->
    wait = Promise.resolve()
    (f) ->
      current = wait
      release = null
      wait = new Promise((resolve) -> release = resolve).catch ->
      current.then => f.call @, release

  exclusive: (f) ->
    lock = module.exports.mutex()
    (args...) ->
      lock (release) =>
        result = f.call @, args...
        release result
        result

  # takes a time period in seconds and formats it as hh:mm:ss
  formatTimePeriod: (dt) ->
    return unless dt > 1
    h = Math.floor dt/(60*60)
    m = Math.floor (dt -= h*60*60)/60
    s = Math.round (dt - m*60)
    parts = [h, m, s]
    for i, dt of parts
      parts[i] = if dt < 10 then "0#{dt}" else "#{dt}"
    parts.join ':'
