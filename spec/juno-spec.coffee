juno = require '../lib/julia-client'

# Testing-specific settings
juno.connection.process.jlpath = -> "julia"
juno.connection.process.workingDir = -> process.env.HOME || process.env.USERPROFILE

describe "package activation", ->
  it "activates without errors", ->
    waitsForPromise ->
      atom.packages.activatePackage 'ink'
    waitsForPromise ->
      atom.packages.activatePackage 'julia-client'

describe "basic client interaction", ->
  it "boots a julia client", ->
    waitsForPromise ->
      juno.connection.boot().then (pong) ->
        expect(pong).toBe 'pong'
