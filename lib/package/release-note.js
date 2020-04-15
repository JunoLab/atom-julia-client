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
  const panel = atom.workspace.addModalPanel({ item: view })

  const inner = document.createElement('div')
  inner.classList.add('julia-client-release-note')
  inner.setAttribute('tabindex', "1")

  const closeButton = document.createElement('button')
  closeButton.classList.add('btn', 'icon', 'icon-remove-close', 'release-note-close-button')

  view.appendChild(closeButton)
  view.appendChild(inner)

  closeButton.onclick = () => panel.hide()

  const showNote = (version, versions) => {
    const p = path.join(RELEASE_NOTE_DIR, version + '.md')
    const markdown = readCode(p)
    inner.innerHTML = marked(markdown)
    panel.show()
    view.focus()
  }
  const close = () => {
    panel.hide()
  }
  const panelView = panel.getElement()
  panelView.style['max-width'] = '75em'

  subs.add(
    atom.commands.add('atom-workspace', 'julia-client:open-release-note', () => {
      const versions = fs.readdirSync(RELEASE_NOTE_DIR)
        .filter(path => path !== 'README.md')
        .map(path => path.replace(/(.+)\.md/, 'v $1'))
      show(versions)
        .then(version => showNote(version.replace(/v\s(.+)/, '$1')))
        .catch(err => console.log(err))
    }),
    new Disposable(() => {
      panel.destroy()
    }),
    atom.commands.add(panelView, 'julia-client:cancel-release-note',  (event) => {
      console.log(event);
      panel.hide()
      event.stopPropagation()
    })
  )

  if (startupNoteVersion) {
    setTimeout(() => showNote(startupNoteVersion), 500)
  }
}

export function deactivate () {
  if (subs) subs.dispose()
}
