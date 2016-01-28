juno = require '../lib/julia-client'

# Testing-specific settings
juno.connection.process.jlpath = -> "julia"
juno.connection.process.workingDir = -> process.env.HOME || process.env.USERPROFILE

describe "the package", ->
  it "activates without errors", ->
    waitsForPromise ->
      atom.packages.activatePackage 'ink'
    waitsForPromise ->
      atom.packages.activatePackage 'julia-client'

describe "managing the Julia process", ->
  client = juno.connection.client
  clientStatus = -> [client.isConnected(), client.isActive(), client.isWorking()]
  {echo, evalsimple} = juno.connection.client.import ['echo', 'evalsimple']
  bootPromise = null

  it "recognises the client's state before boot", ->
    expect(clientStatus()).toEqual [false, false, false]

  it "initiates the boot", ->
    bootPromise = juno.connection.boot()

  it "recognises the client's state during boot", ->
    expect(clientStatus()).toEqual [false, true, true]

  it "waits for the boot to complete", ->
    waitsForPromise ->
      bootPromise.then (pong) ->
        expect(pong).toBe('pong')

  it "recognises the client's state after boot", ->
    expect(clientStatus()).toEqual [true, true, false]

  it "responds to rpc messages", ->
    msg = {x: 1, y: 2}
    waitsForPromise ->
      echo(msg).then (response) ->
        expect(response).toEqual(msg)

    waitsForPromise ->
      evalsimple("2+2").then (result) ->
        expect(result).toBe(4)

  it "exits the process", ->
    waitsForPromise ->
      evalsimple('exit()').catch ->

  it "recognises the client's state after exit", ->
    expect(clientStatus()).toEqual [false, false, false]

describe "rpc", ->

describe "editor support", ->

describe "the console", ->
