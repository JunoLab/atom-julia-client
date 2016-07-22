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

  jlpath: -> atom.config.get("julia-client.juliaPath")

  getVersion: (path = @jlpath()) ->
    new Promise (resolve, reject) =>
      proc = child_process.exec "\"#{path}\" --version", (err, stdout, stderr) =>
        return reject(stderr) if err?
        res = stdout.match /(\d+)\.(\d+)\.(\d+)/
        return reject("Coudln't resolve version.") unless res?
        [_, major, minor, patch] = res
        resolve {major, minor, patch}

  projectDir: ->
    dirs = atom.workspace.project.getDirectories()
    ws = process.env.HOME || process.env.USERPROFILE
    if dirs.length is 0 or dirs[0].path.match 'app.asar'
      return Promise.resolve ws
    new Promise (resolve) ->
      # use the first open project folder (or its parent folder for files) if
      # it is valid
      fs.stat dirs[0].path, (err, stats) =>
        if err? then return resolve ws
        if stats.isFile()
          resolve path.dirname dirs[0].path
        else
          resolve dirs[0].path

  packageDir: (s...) ->
    packageRoot = path.resolve __dirname, '..', '..'
    path.join packageRoot, s...

  script: (s...) -> @packageDir 'script', s...
