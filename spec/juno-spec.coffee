juno = require '../lib/julia-client'

# Testing-specific settings
juno.connection.process.jlpath = -> "julia"
juno.connection.process.workingDir = -> process.env.HOME || process.env.USERPROFILE
juno.connection.process.pipeConsole = true

describe "the package", ->
  it "activates without errors", ->
    waitsForPromise ->
      atom.packages.activatePackage 'ink'
    waitsForPromise ->
      atom.packages.activatePackage 'julia-client'

describe "managing the client", ->
  client = juno.connection.client
  clientStatus = -> [client.isConnected(), client.isActive(), client.isWorking()]
  {echo, evalsimple} = client.import ['echo', 'evalsimple']
  bootPromise = null

  describe "when booting the client", ->

    it "recognises the client's state before boot", ->
      expect(clientStatus()).toEqual [false, false, false]

    it "initiates the boot", ->
      bootPromise = juno.connection.boot()

    it "recognises the client's state during boot", ->
      expect(clientStatus()).toEqual [false, true, true]

    it "waits for the boot to complete", ->
      waitsFor 'client to boot', 60*1000, (done) ->
        bootPromise.then (pong) ->
          expect(pong).toBe('pong')
          done()

    it "recognises the client's state after boot", ->
      expect(clientStatus()).toEqual [true, true, false]

  describe "while the client is active", ->

    it "can send and receive nested objects, strings and arrays", ->
      msg = {x: 1, y: [1,2,3], z: "foo"}
      waitsForPromise ->
        echo(msg).then (response) ->
          expect(response).toEqual(msg)

    it "can evaluate code and return the result", ->
      for x in [1..10]
        do (x) ->
          waitsForPromise ->
            evalsimple("#{x}^2").then (result) ->
              expect(result).toBe(Math.pow(x, 2))

    it "can rpc into the frontend", ->
      client.handle 'test', (x) -> Math.pow(x, 2)
      for x in [1..10]
        do (x) ->
          waitsForPromise ->
            evalsimple("@rpc test(#{x})").then (result) ->
              expect(result).toBe(Math.pow(x, 2))

    it "can retrieve promise values from the frontend", ->
      client.handle 'test', (x) ->
        new Promise (resolve) ->
          resolve x
      waitsForPromise ->
        evalsimple("@rpc test(2)").then (x) ->
          expect(x).toBe(2)

    cbs = null
    it "enters loading state while callbacks are pending", ->
      cbs = (evalsimple("peakflops()") for i in [1..5])
      expect(client.isWorking()).toBe(true)

    it "stops loading when callbacks are done", ->
      for cb in cbs
        do (cb) ->
          waitsForPromise ->
            cb
      runs ->
        expect(client.isWorking()).toBe(false)

  describe "when the process is shut down", ->

    it "rejects pending callbacks", ->
      waitsFor (done) ->
        evalsimple('exit()').catch -> done()

    it "recognises the client's state after exit", ->
      expect(clientStatus()).toEqual [false, false, false]
