/** @babel */

import fs from 'fs'
import path from 'path'
import { CompositeDisposable, Disposable } from 'atom'
import { client } from '../connection'
import { show } from '../ui/selector'

const { allProjects, activateProject } = client.import({ rpc: ['allProjects'], msg: ['activateProject'] })

let ink
export function consumeInk (_ink) {
  ink = _ink
}

export function consumeStatusBar (statusBar) {
  const subs = new CompositeDisposable()

  const dom = document.createElement('a')
  const tileDom = document.createElement('span') // only `span` element can be hide completely
  tileDom.classList.add('julia', 'inline-block')
  tileDom.appendChild(dom)
  const tile = statusBar.addRightTile({
    item: tileDom,
    priority: 10
  })

  let projectName = ''
  let projectPath = ''

  const showTile = () => tileDom.style.display = ''
  const hideTile = () => tileDom.style.display = 'none'
  const updateTile = (proj) => {
    if (!proj) return
    dom.innerText = projectName = proj.name
    projectPath = proj.path
    showTile()
  }
  client.handle({ updateProject: updateTile })

  const onClick = (event) => {
    if (process.platform === 'darwin' ? event.metaKey : event.ctrlKey) {
      if (!fs.existsSync(projectPath)) return
      const pending = atom.config.get('core.allowPendingPaneItems')
      if (ink) {
        ink.Opener.open(projectPath, {
          pending,
        })
      } else {
        atom.workspace.open(projectPath, {
          pending,
          searchAllPanes: true
        })
      }
    } else {
      client.require('choose environment', () => {
        const p = allProjects()
          .then(proj => {
            return proj.map(proj => {
              proj.primary = proj.name
              proj.secondary = proj.path
              return proj
            })
          })
          .catch(err => console.log(err))
        show(p, { active: projectName }).then(proj => {
          if (!proj) return
          const dir = path.dirname(proj.path)
          activateProject(dir)
        })
      })
    }
  }

  const modifiler = process.platform == 'darwin' ? 'Cmd' : 'Ctrl'
  const title = () => {
    return `Currently working in environment ${projectName} at ${projectPath}<br >` +
      `Click to choose an environment<br >` +
      `${modifiler}-Click to open project file`
  }

  dom.addEventListener('click', onClick)
  subs.add(
    client.onDetached(hideTile),
    atom.tooltips.add(dom, { title }),
    new Disposable(() => {
      dom.removeEventListener('click', onClick)
      tile.destroy()
    })
  )

  hideTile()
  return subs
}
