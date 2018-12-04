'use babel'

import { client } from '../connection'
import { selector } from '../ui'

var { packages } = client.import({ rpc: ['packages'] })

export function openPackage () {
  let pkgs = packages()
  pkgs.then(pkgs => {
    ps =  []
    for (pkg in pkgs) {
      ps.push({primary: pkg, secondary: pkgs[pkg]})
    }
    selector.show(ps).then( pkg => {
      if (pkg) {
        atom.open({ pathsToOpen: [pkgs[pkg.primary]]})
      }
    })
  }).catch(() => {
    atom.notifications.addError("Couldn't find your Julia packages.")
  })
}
