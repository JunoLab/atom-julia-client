'use babel'

import { client } from '../connection'

let profile

export function activate(ink) {
  let pane = ink.PlotPane.fromId('Profile')
  pane.getTitle = function () {return 'Profiler'}

  client.handle({
    profile(data) {
      profile = new ink.Profiler.ProfileViewer({data})
      pane.open({split: 'right'})
      pane.show(profile)
    }
  })
}
