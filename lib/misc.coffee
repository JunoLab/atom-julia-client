module.exports =
  paths:   require './misc/paths'
  history: require './misc/history'
  blocks:  require './misc/blocks'
  words:   require './misc/words'

  time: (desc, p) ->
    s = -> new Date().getTime()/1000
    t = s()
    p.then (result) ->
      console.log "#{desc}: #{(s()-t).toFixed(2)}s"
      result
