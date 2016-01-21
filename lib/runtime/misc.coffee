# TODO: working directory dialog

path =  require 'path'
shell = require 'shell'
fs =    require 'fs'

{client} = require '../connection'
{selector} = require '../ui'

module.exports =

  client: client.import ['cd']

  homedir: ->
    if process.platform == 'win32'
      process.env.USERPROFILE
    else
      process.env.HOME

  home: (p...) -> path.join @homedir(), p...

  juliaHome: -> process.env.JULIA_HOME or @home '.julia'

  pkgDir: (f) ->
    fs.readdir @juliaHome(), (err, data) =>
      dir = data?.filter((path)=>path.startsWith('v')).sort().pop()
      dir? and f path.join(@juliaHome(), dir)

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

  cdHere: ->
    file = atom.workspace.getActiveTextEditor()?.getPath()
    file? or atom.notifications.addError 'This file has no path.'
    @client.cd path.dirname(file)

  cdProject: ->
    dirs = atom.project.getPaths()
    if dirs.length < 1
      atom.notifications.addError 'This project has no folders.'
    else if dirs.length == 1
      @client.cd dirs[0]
    else
      selector.show(dirs).then (dir) =>
        return unless dir?
        @client.cd dir

  cdHome: ->
    @client.cd @home()
