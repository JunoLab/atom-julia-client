/** @babel */

import { CompositeDisposable, Disposable } from 'atom'
import path from 'path'
import fs from 'fs'
import { show } from '../ui/selector'
import { readCode } from '../misc/paths'

let subs
const RELEASE_NOTE_DIR = path.join(__dirname, '..', '..', 'release-notes')

export function activate (ink, startupNoteVersion) {
  const pane = ink.NotePane.fromId('Note')
  subs = new CompositeDisposable()

  const showNote = (version) => {
    const p = path.join(RELEASE_NOTE_DIR, version + '.md')
    const markdown = readCode(p)
    pane.setNote(markdown)
    pane.setTitle(`Juno release note – v${version}`)
    pane.ensureVisible({
      split: 'right'
    })
  }

  subs.add(
    atom.commands.add('atom-workspace', 'julia-client:open-release-note', () => {
      const versions = fs.readdirSync(RELEASE_NOTE_DIR)
        .filter(path => path !== 'README.md')
        .map(path => path.replace(/(.+)\.md/, 'v $1'))
      show(versions)
        .then(version => showNote(version.replace(/v\s(.+)/, '$1')))
        .catch(err => console.log(err))
    })
  )
  if (startupNoteVersion) showNote(startupNoteVersion)
}

export function deactivate () {
  if (subs) subs.dispose()
}
