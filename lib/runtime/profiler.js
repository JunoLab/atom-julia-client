'use babel'

import { client } from '../connection'

let profile, pane, sub

export function activate(ink) {
  pane = ink.PlotPane.fromId('Profile')
  pane.getTitle = function () {return 'Profiler'}

  client.handle({
    profile(data) {
      profile = new ink.Profiler.ProfileViewer({data})
      pane.open({split: 'right'})
      pane.show(profile)
    }
  })

  sub = atom.commands.add('atom-workspace', 'julia-client:clear-profile', () => {
    pane.show()
    pane.close()
  })
}

export function deactivate() {
  if (sub) sub.dispose()
}
