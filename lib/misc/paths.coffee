path =  require 'path'
fs =    require 'fs'
child_process = require 'child_process'

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
        @getVersion()
          .then (ver) =>
            r = new RegExp("v#{ver.major}\\.#{ver.minor}")
            dir = data?.filter((path) => path.search(r) > -1)[0]
            if dir? then resolve @juliaHome dir else reject()
          .catch => reject()

  packages: ->
    @pkgDir().then (dir) =>
      new Promise (resolve, reject) =>
        fs.readdir dir, (err, data) =>
          if err? then return reject err
          ps = data.filter((path)=>!path.startsWith('.') and
                                    ["METADATA","REQUIRE","META_BRANCH"].indexOf(path) < 0)
          if ps? then resolve ps else reject()

  openPackage: ->
    require('../ui').selector.show(@packages())
      .then (pkg) =>
        return unless pkg?
        @pkgDir().then (dir) ->
          atom.open pathsToOpen: [path.join dir, pkg]
      .catch =>
        atom.notifications.addError "Couldn't find your Julia packages."

  jlpath: ->
    p = atom.config.get("julia-client.juliaPath")
    if p == '[bundle]' then p = @bundledExe()
    p

  getVersion: (path = @jlpath()) ->
    return Promise.resolve @version if @version?
    new Promise (resolve, reject) =>
      proc = child_process.spawn @jlpath(), ["--version"]
      proc.on 'exit', () =>
        str = proc.stdout.read()?.toString()
        res = str.match /(\d+)\.(\d+)\.(\d+)/
        return reject() unless res?
        [_, major, minor, patch] = res
        resolve @version = {major, minor, patch}
