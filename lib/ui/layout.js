'use babel'

export function resetLayout () {
  let msg = atom.notifications.addInfo("Use Standard Layout?", {
    buttons: [{text: "Yes", onDidClick: () => {
      standard()
      msg.dismiss()
      atom.config.set('julia-client.firstBoot', false)
    }}, {text: "No", onDidClick: () => {
      msg.dismiss()
      atom.config.set('julia-client.firstBoot', false)
    }}],
    description: `Opens various Julia specific panes in a default layout.
    Use the \`Julia: Standard Layout\` command to reset the layout at later point in time.`,
    dismissable: true
  })
}

function createDockLayout () {
  let bd = atom.workspace.getBottomDock()
  bd.getPanes()[0].addItem(cons())
  bd.show()

  let rd = atom.workspace.getRightDock()
  let p = rd.getPanes()[0]
  p.addItem(docs())
  p.addItem(workspace())
  let pd = p.splitDown()
  pd.addItem(plots())
  rd.show()
}

function resetDocks () {
  for (let p of atom.workspace.getRightDock().getPanes()) {
    for (let i of p.getItems()) {
      i.close()
    }
    p.destroy()
  }

  for (let p of atom.workspace.getBottomDock().getPanes()) {
    for (let i of p.getItems()) {
      i.close()
    }
    p.destroy()
  }
}

function workspace() { return require('../runtime').workspace.ws }
function docs() { return require('../ui').docpane.pane }
function cons() {
  if (atom.config.get('julia-client.juliaOptions.consoleStyle') == 'REPL-based') {
    return require('../runtime').console2.terminal
  } else {
    return require('../runtime').console.c
  }
}
function plots() { return require('../runtime').plots.pane }

export function standard () {
  resetDocks()
  createDockLayout()
}
