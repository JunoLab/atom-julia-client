'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'

let pane, subs

export function activate (ink) {
  pane = ink.PlotPane.fromId('Profile')
  pane.getTitle = function () {return 'Profiler'}
  subs = new CompositeDisposable()

  subs.add(client.onDetached(() => clear()))

  client.handle({
    profile(data) {
      profile = new ink.Profiler.ProfileViewer({data})
      pane.open({split: 'right'})
      pane.show(new ink.Pannable(profile, {zoomstrategy: 'width'}))
    }
  })

  subs.add(atom.commands.add('atom-workspace', 'julia-client:clear-profile', () => {
    clear()
    pane.close()
  }))
}

function clear () {
  pane.teardown()
}

function close () {
  pane.close()
}

export function deactivate () {
  subs.dispose()
}
