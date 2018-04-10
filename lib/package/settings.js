'use babel'
// update top-level settings from pre-0.6.10

export function updateSettings () {
  let config = require('../package/config')
  let currentSettings = atom.config.get('julia-client')

  let val
  for (let key in currentSettings) {
    // old setting
    if (config[key] == undefined) {
      // JuliaPro specific:
      if (key == 'useStandardLayout') continue
      // unset, so no-one tries to change this
      atom.config.unset('julia-client.' + key)
    }
  }
}
