process.on('uncaughtException', function (err) {
  if (process.connected) {
    process.send({type: 'error', message: err.message, stack: err.stack})
  }
  process.exit(1)
})

process.on('unhandledRejection', function (err) {
  if (process.connected) {
    if (err instanceof Error) {
      process.send({type: 'rejection', message: err.message, stack: err.stack})
    } else {
      process.send({type: 'rejection', err})
    }
  }
})

const server = require('./server')

server.serve()
