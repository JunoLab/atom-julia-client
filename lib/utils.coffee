path = require 'path'
shell = require 'shell'
fs = require 'fs'

module.exports =
  homedir: ->
    if process.plaform == 'win32'
      process.env.USERPROFILE
    else
      process.env.HOME

  home: (p...) -> path.join @homedir(), p...

  juliaHome: -> process.env.JULIA_HOME or @home '.julia'

  packages: (f) ->
    fs.readdir @juliaHome(), (err, data) =>
      dir = data?.filter((path)=>path.startsWith('v')).sort().pop()
      dir? and fs.readdir path.join(@juliaHome(), dir), (err, data) =>
        ps = data?.filter((path)=>!path.startsWith('.') and
                                  ["METADATA","REQUIRE","META_BRANCH"].indexOf(path) < 0)
        ps? and f(ps)

  commands: (subs) ->
    subs.add atom.commands.add 'atom-workspace',
      'julia:open-startup-file': => atom.workspace.open @home '.juliarc.jl'
      'julia:open-package-folder': => shell.openItem @juliaHome
