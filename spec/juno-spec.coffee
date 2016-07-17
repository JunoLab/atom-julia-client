juno = require '../lib/julia-client'

# Testing-specific settings
juno.connection.process.jlpath = -> "julia"
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
  client.onConnected (connectSpy = jasmine.createSpy 'connect')
  client.onDisconnected (disconnectSpy = jasmine.createSpy 'disconnect')

  describe "before booting", ->

    it "can validate the existence of a julia binary", ->
      path = require 'path'
      checkPath = (p) -> juno.misc.paths.getVersion p
      # waitsFor (done) ->
      #   checkPath(path.join path.homedir, '..', '..', 'julia', 'julia').then -> done()
      # waitsFor (done) ->
      #   checkPath(path.join(__dirname, "foobar")).catch -> done()

    it "can validate the existence of a julia command", ->
      checkPath = (p) -> juno.misc.paths.getVersion p
      # waitsFor (done) ->
      #   checkPath("julia").then -> done()
      waitsFor (done) ->
        checkPath("nojulia").catch -> done()

  describe "when booting the client", ->
    bootPromise = null

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

    it "emits a connection event", ->
      expect(connectSpy.calls.length).toBe(1)

  describe "while the client is active", ->

    it "can send and receive nested objects, strings and arrays", ->
      msg = {x: 1, y: [1,2,3], z: "foo"}
      waitsForPromise ->
        echo(msg).then (response) ->
          expect(response).toEqual(msg)

    it "can evaluate code and return the result", ->
      [1..10].forEach (x) ->
        waitsForPromise ->
          evalsimple("#{x}^2").then (result) ->
            expect(result).toBe(Math.pow(x, 2))

    it "can rpc into the frontend", ->
      client.handle 'test', (x) -> Math.pow(x, 2)
      [1..10].forEach (x) ->
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

    describe "when callbacks are pending", ->
      {cbs, workingSpy, doneSpy} = {}

      it "registers loading listeners", ->
        client.onWorking (workingSpy = jasmine.createSpy 'working')
        client.onDone (doneSpy = jasmine.createSpy 'done')

      it "enters loading state", ->
        cbs = (evalsimple("peakflops(1000)") for i in [1..5])
        expect(client.isWorking()).toBe(true)

      it "emits a working event", ->
        expect(workingSpy.calls.length).toBe(1)

      it "stops loading after they are done", ->
        cbs.forEach (cb) ->
          waitsForPromise ->
            cb
        runs ->
          expect(client.isWorking()).toBe(false)

      it "emits a done event", ->
        expect(doneSpy.calls.length).toBe(1)

    it "can handle a large number of concurrent callbacks", ->
      n = 1000
      cbs = (evalsimple("sleep(rand()); #{i}^2") for i in [0...n])
      t = new Date().getTime()
      [0...n].forEach (i) ->
        waitsForPromise ->
          cbs[i].then (result) -> expect(result).toBe(Math.pow(i, 2))
      runs ->
        expect(new Date().getTime() - t).toBeLessThan(1500)

  describe "when the process is shut down", ->

    it "rejects pending callbacks", ->
      waitsFor (done) ->
        evalsimple('exit()').catch -> done()

    it "resets the working state", ->
      expect(client.isWorking()).toBe(false)

    it "emits a disconnection event", ->
      expect(disconnectSpy.calls.length).toBe(1)

    it "recognises the client's state after exit", ->
      expect(clientStatus()).toEqual [false, false, false]
