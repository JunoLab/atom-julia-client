'use babel'

const repl = () => {
  return require('../runtime').console
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
const outline = () => {
  return require('../runtime').outline
}

function specifiedPanes () {
  const panes = []
  // @NOTE: Push panes in order of their 'importance': Refer to function `openPanesHelper` for why
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.console')) panes.push(repl)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.workspace')) panes.push(workspace)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.documentation')) panes.push(documentation)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.plotPane')) panes.push(plotPane)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.debuggerPane')) panes.push(debuggerPane)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.linter')) panes.push(linter)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.outline')) panes.push(outline)

  return panes
}

export function closePromises () {
  // Close only specified panes, i.e.: non-specified panes won't be closed/opened
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
    // If there is no more pane to be opened, activate the first item in each pane. This works since
    // Juno-panes are opened in order of their importance as defined in `specifiedPanes` function
    atom.workspace.getPanes().forEach(pane => {
      pane.activateItemAtIndex(0)
    })
    // Activate `WorkspaceCenter` at last
    atom.workspace.getCenter().activate()
    return
  }

  const pane = panes.shift()
  pane().open().catch((err) => {
    // @FIXME: This is a temporal remedy for https://github.com/JunoLab/atom-julia-client/pull/561#issuecomment-500150318
    console.error(err)
    pane().open()
  }).finally(() => {
    // Re-focus the previously focused pane (i.e. the bundled pane by `bundlePanes`) after each opening
    // This prevents opening multiple panes with the same splitting rule in a same location from
    // ending up in a funny state
    const container = atom.workspace.getActivePaneContainer()
    container.activatePreviousPane()
    openPanesHelper(panes)
  })
}

export function restoreDefaultLayout () {
  // Close Juno-specific panes first to reset to default layout
  Promise.all(closePromises()).then(() => {

    // Simplify layouts in each container to prevent funny splitting
    bundlePanes()

    // Open Juno-specific panes again
    openPanes()
  })
}

export function resetDefaultLayoutSettings () {
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
          restoreDefaultLayout()
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
       **\`Packages -> Juno -> Settings -> Julia-Client -> UI Options -> Layout Options\`**.
       \`Julia-Client: Restore-Default-Layout\` command will restore the layout at later point in time.
       Use \`Julia-Client: Reset-Default-Layout-Settings\` command to reset the layout settings if it gets messed up.`,
    dismissable: true
  })
}
