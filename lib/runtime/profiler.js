'use babel'

import { client } from '../connection'
import { CompositeDisposable } from 'atom'
import { remote } from 'electron'

let pane, subs
var {loadProfileTrace, saveProfileTrace} = client.import({msg: ['loadProfileTrace', 'saveProfileTrace']})

export function activate (ink) {
  pane = ink.PlotPane.fromId('Profile')
  pane.getTitle = () => {return 'Profiler'}
  subs = new CompositeDisposable()

  subs.add(client.onDetached(() => clear()))
  subs.add(atom.config.observe('julia-client.uiOptions.customLayoutOptions.profiler.defaultLocation', (defaultLocation) => {
    pane.getDefaultLocation = () => { return defaultLocation }
  }))

  client.handle({
    profile(data) {
      let save = (path) => saveProfileTrace(path, data)
      profile = new ink.Profiler.ProfileViewer({data, save})
      pane.ensureVisible({
        split: 'julia-client.uiOptions.customLayoutOptions.profiler.split'
      })
      pane.show(new ink.Pannable(profile, {zoomstrategy: 'width', minScale: 0.5}))
    }
  })

  subs.add(atom.commands.add('atom-workspace', 'julia-client:clear-profile', () => {
    clear()
    pane.close()
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:load-profile-trace', () => {
    path = remote.dialog.showOpenDialog({title: 'Load Profile Trace', properties: ['openFile']})
    loadProfileTrace(path)
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
