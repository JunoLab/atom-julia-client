'use babel'

let validSchemes = require('../package/config')
let invalidSchemes = []  // Keeps invalid config schemes to be notified to users

function dispose() {
  validSchemes = null
  invalidSchemes = null
}

/**
 * Updates settings by removing deprecated (i.e.: not used anymore) configs so that no one tries to
 * tweak them.
 */
export function updateSettings() {
  const currentConfig = atom.config.get('julia-client')
  searchForDeprecated(currentConfig, [])

  if (invalidSchemes) {
    const message = atom.notifications.addWarning('Julia-Client: Invalid (deprecated) settings found', {
      detail: invalidSchemes.join('\n'),
      dismissable: true,
      description: 'Remove these invalid settings ?',
      buttons: [
        {
          text: 'Yes',
          onDidClick: () => {
            message.dismiss()
            invalidSchemes.forEach((invalidScheme) => {
              atom.config.unset(invalidScheme)
            })
            dispose()
          }
        },
        {
          text: 'No',
          onDidClick: () => {
            message.dismiss()
            dispose()
          }
        }
      ]
    })
  }
}

/**
 * Recursively search deprecated configs
 */
function searchForDeprecated(config, currentSchemes) {
  Object.entries(config).forEach(([key, value]) => {
    // NOTE: Traverse the current config by post-order in order to push all the invalid config
    // schemes into `invalidSchemes`
    if (Object.prototype.toString.call(value) === '[object Object]') {
      const nextSchemes = currentSchemes.slice(0)
      nextSchemes.push(key)
      searchForDeprecated(value, nextSchemes)
    }

    // Search for a valid scheme corresponding to invalid one
    let validScheme = validSchemes
    currentSchemes.forEach((scheme) => {
      Object.entries(validScheme).forEach(([_key, _value]) => {
        if (_key === scheme) {
          validScheme = _value
        } else if (_key === 'properties' && _value[scheme]) {
          validScheme = _value[scheme]
        }
      })
    });

    // If the valid scheme doesn't have the current config scheme, push it to `invalidSchemes`
    if (!validScheme[key] && (!validScheme.properties || !validScheme.properties[key])) {
      let invalidScheme = 'julia-client.'
      invalidScheme += currentSchemes.length === 0 ? '' : `${currentSchemes.join('.')}.`
      invalidScheme += key
      invalidSchemes.push(invalidScheme)
    }
  });
}
