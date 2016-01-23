# TODO: working directory dialog

path =  require 'path'
fs =    require 'fs'

selector = require '../ui/selector'

module.exports =

  home: (p...) ->
    key = if process.platform == 'win32' then 'USERPROFILE' else 'HOME'
    path.join process.env[key], p...

  juliaHome: (p...) ->
    path.join (process.env.JULIA_HOME or @home '.julia'), p...

  pkgDir: ->
    new Promise (resolve, reject) =>
      fs.readdir @juliaHome(), (err, data) =>
        if err? then return reject err
        dir = data?.filter((path)=>path.startsWith('v')).sort().pop()
        if dir? then resolve @juliaHome dir else reject()

  packages: ->
    @pkgDir().then (dir) =>
      new Promise (resolve, reject) =>
        fs.readdir dir, (err, data) =>
          if err? then return reject err
          ps = data.filter((path)=>!path.startsWith('.') and
                                    ["METADATA","REQUIRE","META_BRANCH"].indexOf(path) < 0)
          if ps? then resolve ps else reject()

  openPackage: ->
    selector.show(@packages())
      .then (pkg) =>
        return unless pkg?
        @pkgDir().then (dir) ->
          atom.open pathsToOpen: [path.join dir, pkg]
      .catch =>
        atom.notifications.addError "Couldn't find your Julia packages."
