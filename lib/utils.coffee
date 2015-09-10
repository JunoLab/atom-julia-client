path = require 'path'
shell = require 'shell'
fs = require 'fs'
client = require './connection/client'
selector = require './ui/selector'

module.exports =
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
    selector.show ps, (pkg) =>
      return unless pkg?
      atom.open pathsToOpen: [path.join dir, pkg]

  cdHere: ->
    file = atom.workspace.getActiveTextEditor()?.getPath()
    file? or atom.notifications.addError 'This file has no path.'
    client.msg 'cd', {path: path.dirname(file)}

  cdProject: ->
    dirs = atom.project.getPaths()
    if dirs.length < 1
      atom.notifications.addError 'This project has no folders.'
    else if dirs.length == 1
      client.msg 'cd', {path: dirs[0]}
    else
      selector.show dirs, (dir) =>
        return unless dir?
        client.msg 'cd', {path: dir}

  cdHome: ->
    client.msg 'cd', {path: @home()}

  commands: (subs) ->
    subs.add atom.commands.add 'atom-workspace',
      'julia:open-startup-file': => atom.workspace.open @home '.juliarc.jl'
      'julia:open-julia-home': => shell.openItem @juliaHome()
      'julia:open-package-in-new-window': => @openPackage()

    subs.add atom.commands.add 'atom-text-editor',
      'julia-client:work-in-file-folder': =>
        client.require => @cdHere()
      'julia-client:work-in-project-folder': =>
        client.require => @cdProject()
      'julia-client:work-in-home-folder': =>
        client.require => @cdHome()
