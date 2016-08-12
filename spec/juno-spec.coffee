juno = require '../lib/julia-client'
{client} = juno.connection

if process.platform is 'darwin'
  process.env.PATH += ':/usr/local/bin'

describe 'juno', ->
  beforeEach ->
    jasmine.attachToDOM atom.views.getView atom.workspace
    waitsForPromise -> atom.packages.activatePackage 'language-julia'
    waitsForPromise -> atom.packages.activatePackage 'ink'
    waitsForPromise -> atom.packages.activatePackage 'julia-client'
    runs ->
      client.onStdout (data) -> console.log data
      client.onStderr (data) -> console.log data
      atom.config.set 'julia-client.juliaPath', 'julia'
      atom.config.set 'julia-client.juliaOptions',
        bootMode: 'Basic'
        optimisationLevel: 2
        deprecationWarnings: false
        precompiled: true

  require './client'
  require './eval'
