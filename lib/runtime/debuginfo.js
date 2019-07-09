'use babel'

import { client } from '../connection'

const { reportinfo } = client.import(['reportinfo'])

export default function debuginfo () {
  let atomReport = ''
  const atomPkgs = ['julia-client', 'ink', 'uber-juno', 'language-julia', 'language-weave', 'indent-detective']
  atomPkgs.forEach((pkg, ind) => {
    atomReport += atomPkgs[ind] + ':\n'
    let activePkg = atom.packages.getActivePackage(pkg)
    if (activePkg) {
      atomReport +=
      `
Version: ${activePkg.metadata.version}
Timings:
  Activation: ${activePkg.activateTime}
  Load: ${activePkg.loadTime}
  Initialization: ${activePkg.initializeTime}
Config:
${JSON.stringify(activePkg.config.settings[pkg], null, 2)}
      `
    } else {
      atomReport += 'not installed\n'
    }
    atomReport += '\n\n'
  })

  reportinfo().then(info => {
    atomReport += info
    showNotification(atomReport)
  }).catch(err => {
    atomReport += 'Could not connect to Julia.'
    showNotification(atomReport)
  })
}

function showNotification (atomReport) {
  atom.notifications.addInfo('Juno Debug Info', {
    description: 'Please provide the info above when you report an issue. ' +
                 'Make sure to strip it of any kind of sensitive info you might ' +
                 'not want to share.',
    detail: atomReport,
    dismissable: true,
    buttons: [
      {
        text: 'Copy to Clipboard',
        onDidClick: () => {
          atom.clipboard.write(atomReport)
        }
      }
    ]
  })
}
