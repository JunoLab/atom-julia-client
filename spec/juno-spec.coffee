juno = require '../lib/julia-client'
{client} = juno.connection

juno.misc.paths.jlpath = -> "julia"

if process.platform is 'darwin'
  process.env.PATH += ':/usr/local/bin'

client.onStdout (s) -> console.log s
client.onStderr (s) -> console.log s

describe "the package", ->
  it "activates without errors", ->
    waitsForPromise ->
      atom.packages.activatePackage 'ink'
    waitsForPromise ->
      atom.packages.activatePackage 'julia-client'

# require './client'
require './eval'
