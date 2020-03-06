path =  require 'path'
fs =    require 'fs'
child_process = require 'child_process'

module.exports =

  home: (p...) ->
    key = if process.platform == 'win32' then 'USERPROFILE' else 'HOME'
    path.join process.env[key], p...

  juliaHome: (p...) ->
    path.join (process.env.JULIA_HOME or @home '.julia'), p...

  jlpath: ->
    @expandHome(atom.config.get("julia-client.juliaPath"))

  expandHome: (p) ->
    if p.startsWith '~' then p.replace '~', @home() else p

  fullPath: (path) ->
    new Promise (resolve, reject) ->
      if fs.existsSync(path) then resolve(path)

      if process.platform is 'win32'
        if /[a-zA-Z]\:/.test(path)
          reject("Couldn't resolve path.")
          return

      which = if process.platform is 'win32' then 'where' else 'which'
      proc = child_process.exec "#{which} \"#{path}\"", (err, stdout, stderr) ->
        return reject(stderr) if err?
        p = stdout.trim()
        return resolve(p) if fs.existsSync(p)
        reject("Couldn't resolve path.")

  getVersion: (path = @jlpath()) ->
    new Promise (resolve, reject) =>
      proc = child_process.exec "\"#{path}\" --version", (err, stdout, stderr) =>
        return reject(stderr) if err?
        res = stdout.match /(\d+)\.(\d+)\.(\d+)/
        return reject("Couldn't resolve version.") unless res?
        [_, major, minor, patch] = res
        resolve {major, minor, patch}

  projectDir: ->
    if atom.config.get('julia-client.juliaOptions.persistWorkingDir')
      return new Promise (resolve) =>
        p = atom.config.get('julia-client.juliaOptions.workingDir')
        try
          fs.stat p, (err, stats) =>
            if err
              resolve(@atomProjectDir())
            else
              resolve(p)
        catch err
          resolve(@atomProjectDir())
    else
      return @atomProjectDir()

  atomProjectDir: ->
    dirs = atom.workspace.project.getDirectories()
    ws = process.env.HOME || process.env.USERPROFILE
    if dirs.length is 0 or dirs[0].path.match 'app.asar'
      return Promise.resolve ws
    new Promise (resolve) ->
      # use the first open project folder (or its parent folder for files) if
      # it is valid
      try
        fs.stat dirs[0].path, (err, stats) =>
          if err?
            resolve(ws)
            return

          if stats.isFile()
            resolve path.dirname dirs[0].path
          else
            resolve dirs[0].path
      catch err
        resolve(ws)

  packageDir: (s...) ->
    packageRoot = path.resolve __dirname, '..', '..'
    path.join packageRoot, s...

  script: (s...) -> @packageDir 'script', s...

  getPathFromTreeView: (el) ->
    # invoked from tree-view context menu
    pathEl = el.closest('[data-path]')
    if not pathEl
      # invoked from command with focusing on tree-view
      activeEl = el.querySelector('.tree-view .selected')
      pathEl = activeEl.querySelector('[data-path]') if activeEl
    return pathEl.dataset.path if pathEl
    return null

  getDirPathFromTreeView: (el) ->
    # invoked from tree-view context menu
    dirEl = el.closest('.directory')
    if not dirEl
      # invoked from command with focusing on tree-view
      activeEl = el.querySelector('.tree-view .selected')
      dirEl = activeEl.closest('.directory') if activeEl
    if dirEl
      pathEl = dirEl.querySelector('[data-path]')
      return pathEl.dataset.path if pathEl
    return null

  readCode: (path) ->
    fs.readFileSync(path, 'utf-8')
