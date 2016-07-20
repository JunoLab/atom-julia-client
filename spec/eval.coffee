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
    waitsForPromise -> atom.workspace.open().then (ed) -> editor = ed
    runs ->
      editor.setGrammar(atom.grammars.grammarForScopeName('source.julia'))

  # it 'shows the current module', ->
  #   expect(juno.runtime.modules.current()).toBe 'Main'

  it 'evaluates code in the editor', ->
    data = ''
    sub = client.onStdout (s) -> data += s
    waitsForPromise ->
      editor.insertText 'print("test")'
      juno.runtime.evaluation.eval()
    runs ->
      expect(data).toBe('test')
      sub.dispose()
