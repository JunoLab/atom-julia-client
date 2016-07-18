juno = require '../lib/julia-client'
{client} = juno.connection

describe 'before evaluation', ->
  it 'boots the client', ->
    waitsFor 60*1000, (done) ->
      juno.connection.boot().then -> done()

describe 'in an editor', ->

  editor = null

  beforeEach ->
    waitsForPromise ->
      atom.workspace.open().then (ed) ->
        ed.setGrammar(atom.grammars.grammarForScopeName('source.julia'))
        editor = ed
