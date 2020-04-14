'use babel'

import { client } from '../connection'
import { selector } from '../ui'

var { packages } = client.import({ rpc: ['packages'] })

export function openPackage (newWindow = true) {
  const pkgs = packages()
  pkgs.then(pkgs => {
    const ps =  []
    for (const pkg in pkgs) {
      ps.push({ primary: pkg, secondary: pkgs[pkg] })
    }
    selector.show(ps, { infoMessage: 'Select package to open' }).then( pkg => {
      if (pkg) {
        if (newWindow) {
          atom.open({ pathsToOpen: [pkgs[pkg.primary]]})
        } else {
          atom.project.addPath(pkgs[pkg.primary], {
            mustExist: true,
            exact: true
          })
        }
      }
    })
  }).catch(() => {
    atom.notifications.addError("Couldn't find your Julia packages.")
  })
}
