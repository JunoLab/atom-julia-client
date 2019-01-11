net = require 'net'
client = require '../client'

module.exports =
  server: null
  port: null

  listeners: []

  next: ->
    conn = new Promise (resolve) =>
      @listeners.push resolve
    conn.dispose = =>
      @listeners = @listeners.filter (x) -> x is conn
    conn

  connect: (sock) ->
    message = (m) -> sock.write JSON.stringify m
    client.readStream sock
    sock.on 'end', -> client.detach()
    sock.on 'error', -> client.detach()
    client.attach {message}

  handle: (sock) ->
    if @listeners.length > 0
      @listeners.shift()(sock)
    else if not client.isActive()
      @connect sock
    else
      sock.end()

  listen: ->
    return Promise.resolve(@port) if @port?
    new Promise (resolve, reject) =>
      externalPort = atom.config.get('julia-client.juliaOptions.externalProcessPort')
      if externalPort == 'random'
        port = 0
      else
        port = parseInt(externalPort)
      @server = net.createServer((sock) => @handle(sock))
      @server.on 'error', (err) =>
        if err.code == 'EADDRINUSE'
          details = ''
          if port != 0
            details = 'Please change to another port in the settings and try again.'
          atom.notifications.addError "Julia could not be started.",
            description: """
            Port `#{port}` is already in use.

            """ + if details isnt ''
              """
              #{details}
              """
            else
              "Please try again or set a fixed port that you know is unused."
            dismissable: true
        reject(err)
      @server.listen port, '127.0.0.1', =>
        @port = @server.address().port
        resolve(@port)
