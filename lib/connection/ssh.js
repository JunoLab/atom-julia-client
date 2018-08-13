'use babel'

import tcp from './process/tcp'

export async function boot() {
  port = await tcp.listen()
  console.log(port)
}
