/** @babel */

import { client } from '../connection'
import { selector, notifications } from '../ui'
import { colors } from '../misc'

export function activate (ink) {
  client.handle({
    select: (items) => selector.show(items),
    input: () => selector.show([], { allowCustom: true }),
    syntaxcolors: (selectors) => colors.getColors(selectors),
    openFile: (file, line) => {
      ink.Opener.open(file, line, {
        pending: atom.config.get('core.allowPendingPaneItems')
      })
    },
    versionwarning: (msg) => {
      atom.notifications.addWarning("Outdated version of Atom.jl detected.", {
        description: msg,
        dismissable: true
      })
    },
    notify: (msg) => notifications.show(msg, true),
    notification: (message, kind = 'Info', options = {}) => {
      try {
        atom.notifications[`add${kind}`](message, options)
      } catch (err) {
        console.log(err)
      }
    }
  })
}
