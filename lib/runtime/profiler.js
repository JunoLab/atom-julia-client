'use babel'

import { client } from '../connection'

export function activate(ink) {
  client.handle({
    profile(data) {
      console.log(data)
      console.log(ink.Profiler)      

      new ink.Profiler.ProfileViewer({data})
    }
  })
}
