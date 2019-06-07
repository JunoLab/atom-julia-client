'use babel'

const repl = () => {
  return require('../runtime').console2
}
const workspace = () => {
  return require('../runtime').workspace
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
const documentation = () => {
  return require('../ui').docpane
}

export function defaultLayout () {
  const activeContainer = atom.workspace.getActivePaneContainer()
  const activePane = atom.workspace.getActivePane()
  const activeItem = atom.workspace.getActivePaneItem()

  const panes = []
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.console')) panes.push(repl)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.workspace')) panes.push(workspace)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.documentation')) panes.push(documentation)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.plotPane')) panes.push(plotPane)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.debuggerPane')) panes.push(debuggerPane)
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.linter')) panes.push(linter)

  openPanes(panes)

  // Re-activate the initially activated item
  activeContainer.activate()
  activePane.activate()
  activePane.activateItem(activeItem)
}

function openPanes (panes) {
  if (panes.length > 0) {
    const pane = panes.shift()
    const promise = pane().open()
    promise.then(() => {
      // Focus the previous active pane after each opening in order for this command to behave as if
      // an user dispatch each opening command/action separately. In other word, this prevents
      // multiple spliting from ending up in a funny state
      const container = atom.workspace.getActivePaneContainer()
      container.activatePreviousPane()
      openPanes(panes)
    })
  }
  return
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
       **'Settings -> Julia-Client > UI Options > Layout'**.\n
       Use \`Julia-Client:Default-Layout\` command to restore the layout at later point in time.`,
    dismissable: true
  })
}
