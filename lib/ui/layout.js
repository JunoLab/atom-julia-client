'use babel'

// @NOTE: Sort panes by importance for `openPanesHelper`
const repl = () => {
  return require('../runtime').console2
}
const workspace = () => {
  return require('../runtime').workspace
}
const documentation = () => {
  return require('../ui').docpane
}
const plotPane = () => {
  return require('../runtime').plots
}
const debuggerPane = () => {
  return require('../runtime').debugger
}
const linter = () => {
  return require('../runtime').linter
}

function specifiedPanes () {
  const panes = []
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.console')) panes.push(repl)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.workspace')) panes.push(workspace)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.documentation')) panes.push(documentation)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.plotPane')) panes.push(plotPane)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.debuggerPane')) panes.push(debuggerPane)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.linter')) panes.push(linter)

  return panes
}

function closePromises () {
  // Close only specified panes, i.e.: non-specified panes won't layouted
  const panes = specifiedPanes()

  const promises = panes.map(pane => {
    return pane().close()
  })

  return promises
}

function bundlePanes () {
  const containers = []
  containers.push(atom.workspace.getCenter())
  containers.push(atom.workspace.getLeftDock())
  containers.push(atom.workspace.getBottomDock())
  containers.push(atom.workspace.getRightDock())

  containers.forEach(container => {
    const panes = container.getPanes()
    const firstPane = panes[0]
    const otherPanes = panes.slice(1)
    otherPanes.forEach(pane => {
      const items = pane.getItems()
      items.forEach(item => {
        pane.moveItemToPane(item, firstPane)
      })
    })
  })
}

function openPanes () {
  const panes = specifiedPanes()

  openPanesHelper(panes)
}

function openPanesHelper (panes) {
  if (panes.length === 0) {
    // If there is no more pane to be opened, activate the first item in each pane, 
    // since Juno-panes are ordered so that "earlier-open, more important" above
    atom.workspace.getPanes().forEach(pane => {
      pane.activateItemAtIndex(0)
    })
    return
  }

  const pane = panes.shift()
  pane().open().then(() => {
    // Re-focust the previously focused pane (simplified pane by `bundlePanes`) after each opening
    // This prevents opening multiple panes with the same splitting rule in a same location from
    // ending up in a funny state
    const container = atom.workspace.getActivePaneContainer()
    container.activatePreviousPane()
    openPanesHelper(panes)
  })
}

export function defaultLayout () {
  // Close Juno-specific panes first to reset to default layout
  Promise.all(closePromises()).then(() => {

    // Simplify layouts in each container to prevent funny splitting
    bundlePanes()

    // Open Juno-specific panes again
    openPanes()
  })
}

export function resetLayoutSettings () {
  const onStartup = atom.config.get('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp')
  atom.config.unset('julia-client.uiOptions.layouts')
  atom.config.set('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp', onStartup)
}

export function queryDefaultLayout () {
  const message = atom.notifications.addInfo('Julia-Client: Open Juno-specific panes on startup ?', {
    buttons: [
      {
        text: 'Yes',
        onDidClick: () => {
          defaultLayout()
          message.dismiss()
          atom.config.set('julia-client.firstBoot', false)
          atom.config.set('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp', true)
        }
      },
      {
        text: 'No',
        onDidClick: () => {
          message.dismiss()
          atom.config.set('julia-client.firstBoot', false)
          atom.config.set('julia-client.uiOptions.layouts.openDefaultPanesOnStartUp', false)
        }
      }
    ],
    description:
      `You can specify the panes to be opened and their _default location_ and _splitting rule_ in
       **\`'Settings -> Julia-Client > UI Options > Layout'\`**.\n
       \`Julia-Client:Default-Layout\` command will restore the layout at later point in time.
       User \`Julia-Client:Reset-Layout-Settings\` command to reset the layout settings if it gets messed up`,
    dismissable: true
  })
}
