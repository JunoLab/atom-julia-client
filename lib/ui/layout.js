'use babel'

const repl = () => {
  return require('../runtime').console2.terminal.open({
    split: atom.config.get('julia-client.uiOptions.layouts.console.split')
  })
}
const workspace = () => {
  return require('../runtime').workspace.open()
}
const plotPane = () => {
  return require('../runtime').plots.open()
}
const debuggerPane = () => {
  return require('../runtime').debugger.openPane()
}
const linter = () => {
  return require('../runtime').linter.linterPane.ensureVisible({
    split: atom.config.get('julia-client.uiOptions.layouts.linter.split')
  })
}
const documentation = () => {
  return require('../ui').docpane.pane.open({
    split: atom.config.get('julia-client.uiOptions.layouts.documentation.split')
  })
}

export function defaultLayout () {
  const activeItem = atom.workspace.getActivePaneItem()
  const activePane = atom.workspace.getActivePane()

  const panes = []
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.console')) panes.push(repl())
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.workspace')) panes.push(workspace())
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.documentation')) panes.push(documentation())
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.plotPane')) panes.push(plotPane())
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.debuggerPane')) panes.push(debuggerPane())
  if (atom.config.get('julia-client.uiOptions.layouts.defaultPanes.linter')) panes.push(linter())

  Promise.all(panes).then(() => {
    activePane.focus()
    activePane.activateItem(activeItem)
  })
}

export function queryDefaultLayout () {
  const message = atom.notifications.addInfo('Julia-Client: Open Juno panes on startup ?', {
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
    description: `You can specify panes to be opened and their default location and splitting rule
    in 'Julia-Client > UI Options > Layout' settings. Use \`Julia-Client:Default-Layout\` command
    to restore the layout at later point in time.`,
    dismissable: true
  })
}
