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

function getPanes() {
  if (atom.workspace.getBottomDock) {
    return atom.workspace.getPanes().slice(0, -3)
  } else {
    return atom.workspace.getPanes()
  }
}

export function isCustomLayout() {
  return getPanes().length > 1
}

function resetLayout() {
  pane = getPanes()[0]
  for (let p of getPanes().slice(1)) {
    for (let item of p.getItems()) {
      p.moveItemToPane(item, pane)
    }
  }
}

function createLayout(layout,
                      pane = atom.workspace.getActivePane()) {
  if (!layout){
  } else if (layout.split && layout.items) {
    let ps = [pane]
    ps.push(layout.vertical ? pane.splitDown() : pane.splitRight())
    for (let i = 0; i < ps.length; i++) {
      createLayout(layout.items[i], ps[i])
    }
  } else if (!layout.split && layout.items) {
    for (let i = 0; i < layout.items.length; i++) {
      pane.activateItem(layout.items[i])
    }
  } else if (layout instanceof Array) {
    for (let i = 0; i < layout.length; i++) {
      pane.activateItem(layout[i])
    }
  } else {
    pane.activateItem(layout)
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


export function standard() {
  let layout = {
    split: true,
    vertical: false,
    items: [
      null,
      {
        split: true,
        vertical: true,
        items: [
          {
            split: false,
            items: [workspace(), docs()]
          },
          plots()
        ]
      }
    ]
  }
  let ps = []
  for (let pane of [workspace(), cons(), docs(), plots()]) ps.push(pane.close())
  Promise.all(ps).then(() => {
    resetLayout()
    createLayout(layout)
    atom.commands.dispatch(atom.views.getView(atom.workspace.getActivePane()), 'julia-client:open-console')
  })
}
