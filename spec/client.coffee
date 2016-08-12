path = require 'path'
juno = require '../lib/julia-client'

{client} = juno.connection

describe "managing the client", ->
  clientStatus = -> [client.isActive(), client.isWorking()]
  {echo, evalsimple} = client.import ['echo', 'evalsimple']

  describe "before booting", ->
    checkPath = (p) -> juno.misc.paths.getVersion p

    it "can validate an existing julia binary", ->
      waitsFor (done) ->
        checkPath(path.join __dirname, '..', '..', 'julia', 'julia').then -> done()

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
      waitsFor 'the client to boot', 60*1000, (done) ->
        pong.then (pong) ->
          expect(pong).toBe('pong')
          done()

    it "recognises the client's state after boot", ->
      expect(clientStatus()).toEqual [true, false]

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
      client.handle test: (x) -> Math.pow(x, 2)
      [1..10].forEach (x) ->
        waitsForPromise ->
          evalsimple("@rpc test(#{x})").then (result) ->
            expect(result).toBe(Math.pow(x, 2))

    it "can retrieve promise values from the frontend", ->
      client.handle test: (x) ->
        Promise.resolve x
      waitsForPromise ->
        evalsimple("@rpc test(2)").then (x) ->
          expect(x).toBe(2)

    it "captures stdout", ->
      data = ''
      sub = client.onStdout (s) -> data += s
      waitsForPromise ->
        evalsimple('print("test")')
      runs ->
        expect(data).toBe('test')
        sub.dispose()

    it "captures stderr", ->
      data = ''
      sub = client.onStderr (s) -> data += s
      waitsForPromise ->
        evalsimple('print(STDERR, "test")')
      runs ->
        expect(data).toBe('test')
        sub.dispose()

    describe "when using callbacks", ->
      {cbs, workingSpy, doneSpy} = {}

      beforeEach ->
        client.onWorking (workingSpy = jasmine.createSpy 'working')
        client.onDone (doneSpy = jasmine.createSpy 'done')
        cbs = (evalsimple("peakflops(1000)") for i in [1..5])

      it "enters loading state", ->
        expect(client.isWorking()).toBe true

      it "emits a working event", ->
        expect(workingSpy.calls.length).toBe(1)

      it "isn't done yet", ->
        expect(doneSpy).not.toHaveBeenCalled()

      describe "when they finish", ->

        beforeEach ->
          cbs.forEach (cb) ->
            waitsForPromise ->
              cb

        it "stops loading after they are done", ->
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

  it "handles shutdown correctly", ->
    waitsFor (done) ->
      evalsimple('exit()').catch -> done()
    runs ->
      expect(client.isWorking()).toBe(false)
      expect(clientStatus()).toEqual [false, false]
