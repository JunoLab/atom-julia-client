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

  command = (ed, c) -> atom.commands.dispatch(atom.views.getView(ed), c)

  waitsForClient = -> waitsFor (done) -> client.onceDone done

  beforeEach ->
    jasmine.attachToDOM atom.views.getView atom.workspace
    waitsForPromise -> atom.packages.activatePackage 'language-julia'
    waitsForPromise -> atom.packages.activatePackage 'ink'
    waitsForPromise -> atom.packages.activatePackage 'julia-client'
    waitsForPromise -> atom.workspace.open().then (ed) -> editor = ed
    runs ->
      editor.setGrammar(atom.grammars.grammarForScopeName('source.julia'))

  it 'evaluates code in the editor', ->
    client.handle 'test', (spy = jasmine.createSpy())
    editor.insertText 'Atom.@rpc test()'
    command editor, 'julia-client:run-block'
    waitsForClient()
    runs ->
      expect(spy).toHaveBeenCalled()
