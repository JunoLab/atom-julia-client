'use babel'

import { client } from '../connection'

var profile, pane

export function activate(ink) {
  pane = ink.PlotPane.fromId('Profile')
  pane.getTitle = function () {return 'Profile'}

  client.handle({
    profile(data) {
      if (!profile) {
        profile = new ink.Profiler.ProfileViewer({data})
      } else {
        profile.update({data})
      }
      console.log(profile)
      pane.open()
      pane.show(profile)
    }
  })

  atom.commands.add('atom-workspace', 'julia-client:clear-profile', () => {
    if (profile) {
      profile.destroy()
      profile = null
    }
  })
}
