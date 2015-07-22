path = require 'path'
shell = require 'shell'

module.exports =
  homedir: ->
    if process.plaform == 'win32'
      process.env.USERPROFILE
    else
      process.env.HOME

  home: (p...) -> path.join @homedir(), p...

  juliaHome: -> process.env.JULIA_HOME or @home '.julia'

  commands: (subs) ->
    subs.add atom.commands.add 'atom-workspace',
      'julia:open-startup-file': => atom.workspace.open @home '.juliarc.jl'
      'julia:open-package-folder': => shell.openItem @juliaHome
