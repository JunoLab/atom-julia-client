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
  it "recognises the client's state before boot", ->
    expect(juno.connection.client.isConnected()).toBeFalsy()
    expect(juno.connection.client.isActive()).toBeFalsy()

  bootPromise = null
  it "initiates the boot", ->
    bootPromise = juno.connection.boot()

  it "recognises the client's state during boot", ->
    expect(juno.connection.client.isConnected()).toBe(false)
    expect(juno.connection.client.isActive()).toBe(true)

  it "waits for the boot to complete", ->
    waitsForPromise ->
      bootPromise.then (pong) ->
        expect(pong).toBe('pong')

  it "recognises the client's state after boot", ->
    expect(juno.connection.client.isConnected()).toBe(true)
    expect(juno.connection.client.isActive()).toBe(true)

  {echo, evalsimple} = juno.connection.client.import ['echo', 'evalsimple']

  it "responds to rpc messages", ->
    msg = {x: 1, y: 2}
    waitsForPromise ->
      echo(msg).then (response) ->
        expect(msg).toBe(msg)

    waitsForPromise ->
      evalsimple("2+2").then (result) ->
        expect(result).toBe(4)

  it "recognises the client's state after exit"

describe "rpc", ->

describe "editor support", ->

describe "the console", ->
