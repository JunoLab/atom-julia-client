module.exports =
  paths:   require './misc/paths'
  history: require './misc/history'
  blocks:  require './misc/blocks'
  words:   require './misc/words'

  bufferLines: (f) ->
    buffer = ['']
    (data) ->
      str = data.toString()
      lines = str.split '\n'
      buffer[0] += lines.shift()
      buffer.push lines...
      while buffer.length > 1
        f buffer.shift()

  time: (desc, p) ->
    s = -> new Date().getTime()/1000
    t = s()
    p.then -> console.log "#{desc}: #{(s()-t).toFixed(2)}s"
      .catch ->
    p

  hook: (obj, method, f) ->
    souper = obj[method].bind obj
    obj[method] = (a...) -> f souper, a...

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
