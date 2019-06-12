path = require 'path'
juno = require '../lib/julia-client'

{client} = juno.connection

module.exports = ->

  clientStatus = -> [client.isActive(), client.isWorking()]
  {echo, evalsimple} = client.import ['echo', 'evalsimple']

  describe "before booting", ->
    checkPath = (p) -> juno.misc.paths.getVersion p

    it "can invalidate a non-existant julia binary", ->
      waitsFor (done) ->
        checkPath(path.join(__dirname, "foobar")).catch -> done()

    it "can validate a julia command", ->
      waitsFor (done) ->
        checkPath("julia").then -> done()

    it "can invalidate a non-existant julia command", ->
      waitsFor (done) ->
        checkPath("nojulia").catch -> done()

  conn = null
  beforeEach ->
    if conn?
      client.attach conn

  describe "when booting the client", ->

    it "recognises the client's state before boot", ->
      expect(clientStatus()).toEqual [false, false]

    it "initiates the boot", ->
      waitsForPromise -> juno.connection.local.start()
      runs ->
        conn = client.conn

    it "waits for the boot to complete", ->
      pong = client.import('ping')()
      expect(clientStatus()).toEqual [true, true]
      waitsFor 'the client to boot', 5*60*1000, (done) ->
        pong.then (pong) ->
          expect(pong).toBe('pong')
          done()

    # it "recognises the client's state after boot", ->
    #   expect(clientStatus()).toEqual [true, false]

  describe "while the client is active", ->

    it "can send and receive nested objects, strings and arrays", ->
      msg = {x: 1, y: [1,2,3], z: "foo"}
      waitsForPromise ->
        echo(msg).then (response) ->
          expect(response).toEqual(msg)

    it "can evaluate code and return the result", ->
      remote = [1..10].map (x) -> evalsimple("#{x}^2")
      waitsForPromise ->
        Promise.all(remote).then (remote) ->
          expect(remote).toEqual (Math.pow(x, 2) for x in [1..10])

    it "can rpc into the frontend", ->
      client.handle test: (x) -> Math.pow(x, 2)
      remote = (evalsimple("Atom.@rpc test(#{x})") for x in [1..10])
      waitsForPromise ->
        Promise.all(remote).then (remote) ->
          expect(remote).toEqual (Math.pow(x, 2) for x in [1..10])

    it "can retrieve promise values from the frontend", ->
      client.handle test: (x) -> Promise.resolve x
      waitsForPromise ->
        evalsimple("Atom.@rpc test(2)").then (x) ->
          expect(x).toBe 2

    describe "when using callbacks", ->
      {cbs, workingSpy, doneSpy} = {}

      beforeEach ->
        client.onWorking (workingSpy = jasmine.createSpy 'working')
        client.onDone (doneSpy = jasmine.createSpy 'done')
        cbs = (evalsimple("peakflops(100)") for i in [1..5])

      it "enters loading state", ->
        expect(client.isWorking()).toBe true

      # it "emits a working event", ->
      #   expect(workingSpy.calls.length).toBe(1)

      it "isn't done yet", ->
        expect(doneSpy).not.toHaveBeenCalled()

      describe "when they finish", ->

        beforeEach ->
          waitsFor 10*1000, (done) ->
            Promise.all(cbs).then done

        it "stops loading after they are done", ->
          expect(client.isWorking()).toBe(false)

        it "emits a done event", ->
          expect(doneSpy.calls.length).toBe(1)

    it "can handle a large number of concurrent callbacks", ->
      n = 100
      cbs = (evalsimple("sleep(rand()); #{i}^2") for i in [0...n])
      waitsForPromise ->
        Promise.all(cbs).then (xs) ->
          expect(xs).toEqual (Math.pow(x, 2) for x in [0...n])

  it "handles shutdown correctly", ->
    waitsFor (done) ->
      evalsimple('exit()').catch -> done()
    runs ->
      expect(client.isWorking()).toBe(false)
      expect(clientStatus()).toEqual [false, false]
