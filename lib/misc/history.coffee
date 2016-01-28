fs = require 'fs'
readline = require 'readline'

paths = require './paths'

module.exports =
  path: paths.home '.julia_history'

  read: ->
    new Promise (resolve) =>
      lineReader = readline.createInterface
        input: fs.createReadStream @path

      entries = []
      readingMeta = false

      lineReader.on 'line', (line) =>
        if line.startsWith '#'
          if !readingMeta
            entries.push {loaded: true}
            readingMeta = true
          [_, key, val] = line.match /# (.+?): (.*)/
          entries[entries.length-1][key] = val
        else
          readingMeta = false
          entry = entries[entries.length-1]
          if entry.hasOwnProperty 'input'
            entry.input += '\n' + line.slice(1)
          else
            entry.input = line.slice(1)

      lineReader.on 'close', ->
        resolve entries

  write: (entries) ->
    return unless entries?
    out = fs.createWriteStream @path, flags: 'a'
    for entry in entries
      writeKey = (k, v) -> out.write "# #{k}: #{v}\n"
      if not entry.loaded
        if entry.time? then writeKey 'time', entry.time
        writeKey 'mode', entry.mode or 'julia'
        for line in entry.input.split '\n'
          out.write "\t#{line}\n"
    return
