path = require 'path'
shell = require 'shell'
fs = require 'fs'
comm = require './connection/comm'
selector = require './ui/selector'

module.exports =
  homedir: ->
    if process.plaform == 'win32'
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
    selector.show ps, (pkg) =>
      atom.open pathsToOpen: [path.join dir, pkg]

  cdHere: ->
    file = atom.workspace.getActiveTextEditor()?.getPath()
    file? or atom.notifications.addError 'This file has no path.'
    comm.msg 'cd', {path: path.dirname(file)}

  cdProject: ->
    # TODO: multiple folders
    dir = atom.project.getPaths()?[0]
    dir? or atom.notifications.addError 'This project has no folders.'
    comm.msg 'cd', {path: dir}

  cdHome: ->
    comm.msg 'cd', {path: @home()}

  commands: (subs) ->
    subs.add atom.commands.add 'atom-workspace',
      'julia:open-startup-file': => atom.workspace.open @home '.juliarc.jl'
      'julia:open-julia-home': => shell.openItem @juliaHome()
      'julia:open-package-in-new-window': => @openPackage()

    subs.add atom.commands.add 'atom-text-editor',
      'julia-client:work-in-file-folder': =>
        comm.requireClient => @cdHere()
      'julia-client:work-in-project-folder': =>
        comm.requireClient => @cdProject()
      'julia-client:work-in-home-folder': =>
        comm.requireClient => @cdHome()
