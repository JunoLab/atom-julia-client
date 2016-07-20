juno = require '../lib/julia-client'
{client} = juno.connection

# TODO: handle deactivation properly, create a persistent client and inject it
# each test

describe 'before evaluation', ->
  it 'boots the client', ->
    waitsFor 60*1000, (done) ->
      juno.connection.boot().then -> done()

describe 'in an editor', ->

  editor = null

  beforeEach ->
    waitsForPromise -> atom.packages.activatePackage 'language-julia'
    waitsForPromise -> atom.packages.activatePackage 'ink'
    waitsForPromise -> atom.packages.activatePackage 'julia-client'
    waitsForPromise ->
      atom.workspace.open().then (ed) ->
        ed.setGrammar(atom.grammars.grammarForScopeName('source.julia'))
        editor = ed
