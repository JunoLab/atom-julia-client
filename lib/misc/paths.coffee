# TODO: working directory dialog

path =  require 'path'
fs =    require 'fs'

{selector} = require '../ui'

module.exports =

  home: (p...) ->
    key = if process.platform == 'win32' then 'USERPROFILE' else 'HOME'
    path.join process.env[key], p...

  juliaHome: (p...) ->
    path.join((process.env.JULIA_HOME or @home '.julia'), p...)

  pkgDir: (f) ->
    fs.readdir @juliaHome(), (err, data) =>
      dir = data?.filter((path)=>path.startsWith('v')).sort().pop()
      dir? and f @juliaHome dir

  packages: (f) ->
    @pkgDir (dir) =>
      fs.readdir dir, (err, data) =>
        ps = data?.filter((path)=>!path.startsWith('.') and
                                  ["METADATA","REQUIRE","META_BRANCH"].indexOf(path) < 0)
        ps? and f(ps, dir)

  openPackage: ->
    dir = ''
    ps = new Promise (resolve) =>
      @packages (ps, d) =>
        dir = d
        resolve ps
    selector.show(ps).then (pkg) =>
      return unless pkg?
      atom.open pathsToOpen: [path.join dir, pkg]
