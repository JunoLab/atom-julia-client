juno = require '../lib/julia-client'
{client} = juno.connection

if process.platform is 'darwin'
  process.env.PATH += ':/usr/local/bin'

basicSetup = ->
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

cyclerSetup = ->
  basicSetup()
  runs -> atom.config.set 'julia-client.juliaOptions.bootMode', 'Cycler'

conn = null

withClient = ->
  beforeEach -> client.attach conn

testClient = require './client'
testEval = require './eval'

describe "managing a basic client", ->
  beforeEach basicSetup
  testClient()

describe "interaction with client cycler", ->
  beforeEach cyclerSetup
  testClient()

describe "before use", ->
  beforeEach cyclerSetup
  it 'boots the client', ->
    waitsFor 5*60*1000, (done) ->
      juno.connection.boot().then -> done()
    runs ->
      conn = client.conn

describe "in an editor", ->
  beforeEach cyclerSetup
  withClient()
  testEval()

describe "after use", ->
  beforeEach cyclerSetup
  withClient()
  it "kills the client", ->
    client.kill()
