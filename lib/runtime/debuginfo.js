'use babel'

import { client } from '../connection'

const { reportinfo } = client.import(['reportinfo'])

export default function debuginfo () {
  let atomReport = "# Juno: Debug Information\n"

  // Atom
  let processVersions = ''
  for (const key in process.versions) {
    processVersions += `<li>${key}: ${process.versions[key]}</li>`
  }
  atomReport += `
## Atom:
Version: **${atom.getVersion()}**
Dev Mode: ${atom.inDevMode()}
Official Release: ${atom.isReleasedVersion()}
<details>
<summary><code>process.versions</code>:</summary>
<ul>${processVersions}</ul>
</details>
`

  // Atom packages
  atomReport += `\n## Atom packages:`
  const atomPkgs = ['julia-client', 'ink', 'uber-juno', 'language-julia', 'language-weave',
                    'indent-detective', 'latex-completions']
  atomPkgs.forEach(pkg => {
    atomReport += `\n### ${pkg}:`
    const activePkg = atom.packages.getActivePackage(pkg)
    if (activePkg) {
      atomReport += `
Version: **${activePkg.metadata.version}**
<details>
<summary>Config:</summary>
<pre><code>${JSON.stringify(activePkg.config.settings[pkg], null, 2)}</code></pre>
</details>
`
    } else {
      atomReport += ` not installed\n`
    }
  })

  // julia
  atomReport += "\n## Julia:"
  reportinfo()
  .then(results => {
    // implemented in https://github.com/JunoLab/Atom.jl/commit/3d537a8ddc0a6332e1a01d969904791aa6c12ace
    if (results.versioninfo && results.pkgstatus) {
      atomReport += `
> \`versioninfo()\`
\`\`\`
${results.versioninfo}
\`\`\`
> \`Pkg.status()\`
\`\`\`
${results.pkgstatus}
\`\`\`
`
    } else {
      atomReport += `
> \`versioninfo()\`, \`Pkg.status()\`
\`\`\`
${results}
\`\`\`
`
    }
  })
  .catch(err => {
    atomReport += `
Could not connect to Julia by the following error:
\`\`\`
${err}
`
  })
  .finally(() => {
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
