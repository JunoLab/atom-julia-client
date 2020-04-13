/** @babel */

import { CompositeDisposable, Disposable } from 'atom'
import path from 'path'
import fs from 'fs'
import marked from 'marked'
import { show } from '../ui/selector'
import { readCode } from '../misc/paths'

let subs
const RELEASE_NOTE_DIR = path.join(__dirname, '..', '..', 'release-notes')

export function activate (startupNoteVersion) {
  subs = new CompositeDisposable()
  const view = document.createElement('div')
  view.classList.add('julia-client-release-note')
  const panel = atom.workspace.addModalPanel({ item: view })
  const showNote = (version) => {
    const p = path.join(RELEASE_NOTE_DIR, version + '.md')
    const markdown = readCode(p)
    view.innerHTML = marked(markdown)
    panel.show()
  }
  const close = () => {
    panel.hide()
  }
  const panelView = panel.getElement()
  panelView.style['max-width'] = '75em'
  panelView.addEventListener('blur', close) // BUG: doesn't work
  subs.add(
    atom.commands.add('atom-workspace',  'julia-client:open-release-note', () => {
      const versions = fs.readdirSync(RELEASE_NOTE_DIR)
        .filter(path => path !== 'README.md')
        .map(path => path.replace(/(.+)\.md/, 'v $1'))
      show(versions)
        .then(version => showNote(version.replace(/v\s(.+)/, '$1')))
        .catch(err => console.log(err))
    }),
    new Disposable(() => {
      panel.destroy()
    })
  )
  if (startupNoteVersion) showNote(startupNoteVersion) // BUG: doesn't work
}

export function deactivate () {
  if (subs) subs.dispose()
}
