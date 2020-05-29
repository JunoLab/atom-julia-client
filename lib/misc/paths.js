/** @babel */

import path from 'path'
import fs from 'fs'
import child_process from 'child_process'

export function home (...p) {
  const key = process.platform === 'win32' ? 'USERPROFILE' : 'HOME'
  return path.join(process.env[key], ...p)
}

export function juliaHome (...p) {
  const juliaHome = (process.env.JULIA_HOME || home('.julia'))
  return path.join(juliaHome, ...p)
}

export function jlpath () {
  return expandHome(atom.config.get('julia-client.juliaPath'))
}

export function expandHome (p) {
  return p.startsWith('~') ? p.replace('~', home()) : p
}

export function fullPath (p) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(p)) {
      return resolve(fs.realpathSync(p))
    }
    const current_dir = process.cwd()
    const exepath = path.dirname(process.execPath)

    try {
      process.chdir(exepath)
      const realpath = fs.realpathSync(p)
      if (fs.existsSync(realpath)) {
        resolve(realpath)
      }
    } catch (err) {
      console.log(err)
    } finally {
      try {
        process.chdir(current_dir)
      } catch (err) {
        console.error(err)
      }
    }
    if (process.platform === 'win32') {
      if (/[a-zA-Z]\:/.test(p)) return reject("Couldn't resolve path.")
    }
    const which = process.platform === 'win32' ? 'where' : 'which'
    child_process.exec(`${which} "${p}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr)
      const p = stdout.trim()
      if (fs.existsSync(p)) return resolve(p)
      return reject('Couldn\'t resolve path.')
    })
  })
}

export function getVersion (path = jlpath()) {
  return new Promise((resolve, reject) => {
    fullPath(path).then(path => {
      child_process.exec(`"${path}" --version`, (err, stdout, stderr) => {
        if (err) return reject(stderr)
        const res = stdout.match(/(\d+)\.(\d+)\.(\d+)/)
        if (!res) return reject('Couldn\'t resolve version.')
        const [_, major, minor, patch] = res
        return resolve({ major, minor, patch })
      })
    }).catch(e => {
      reject('Couldn\'t resolve version.')
    })
  })
}

export function projectDir () {
  if (atom.config.get('julia-client.juliaOptions.persistWorkingDir')) {
    return new Promise(resolve => {
      const p = atom.config.get('julia-client.juliaOptions.workingDir')
      try {
        fs.stat(p, (err, stats) => {
          if (err) {
            return resolve(atomProjectDir())
          } else {
            return resolve(p)
          }
        })
      } catch (err) {
        return resolve(atomProjectDir())
      }
    })
  } else {
    return atomProjectDir()
  }
}

function atomProjectDir () {
  const dirs = atom.workspace.project.getDirectories()
  let ws = process.env.HOME
  if (!ws) {
    ws = process.env.USERPROFILE
  }
  if (dirs.length === 0 || dirs[0].path.match('app.asar')) {
    return Promise.resolve(ws)
  }
  return new Promise(resolve => {
    // use the first open project folder (or its parent folder for files) if
    // it is valid
    try {
      fs.stat(dirs[0].path, (err, stats) => {
        if (err) return resolve(ws)
        if (stats.isFile()) return resolve(path.dirname(dirs[0].path))
        return resolve(dirs[0].path)
      })
    } catch (err) {
      return resolve(ws)
    }
  })
}

function packageDir (...s) {
  const packageRoot = path.resolve(__dirname, '..', '..')
  return path.join(packageRoot, ...s)
}

export const script = (...s) => packageDir('script', ...s)

export function getPathFromTreeView (el) {
  // invoked from tree-view context menu
  let pathEl = el.closest('[data-path]')
  if (!pathEl) {
    // invoked from command with focusing on tree-view
    const activeEl = el.querySelector('.tree-view .selected')
    if (activeEl) pathEl = activeEl.querySelector('[data-path]')
  }
  if (pathEl) return pathEl.dataset.path
  return null
}

export function getDirPathFromTreeView (el) {
  // invoked from tree-view context menu
  let dirEl = el.closest('.directory')
  if (!dirEl) {
    // invoked from command with focusing on tree-view
    const activeEl = el.querySelector('.tree-view .selected')
    if (activeEl) dirEl = activeEl.closest('.directory')
  }
  if (dirEl) {
    const pathEl = dirEl.querySelector('[data-path]')
    if (pathEl) return pathEl.dataset.path
  }
  return null
}

export const readCode = (path) => fs.readFileSync(path, 'utf-8')
