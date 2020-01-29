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
  subs.add(atom.config.observe('julia-client.uiOptions.layouts.profiler.defaultLocation', (defaultLocation) => {
    pane.setDefaultLocation(defaultLocation)
  }))

  client.handle({
    profile(data) {
      const save = (path) => saveProfileTrace(path, data)
      const profile = new ink.Profiler.ProfileViewer({data, save, customClass: 'julia-profile'})
      pane.ensureVisible({
        split: atom.config.get('julia-client.uiOptions.layouts.profiler.split')
      })
      pane.show(new ink.Pannable(profile, {zoomstrategy: 'width', minScale: 0.5}))
    }
  })

  subs.add(atom.commands.add('atom-workspace', 'julia-client:clear-profile', () => {
    clear()
    pane.close()
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:load-profile-trace', () => {
    const path = remote.dialog.showOpenDialog({title: 'Load Profile Trace', properties: ['openFile']})
    loadProfileTrace(path)
  }))
}

function clear () {
  pane.teardown()
}

export function deactivate () {
  subs.dispose()
}
