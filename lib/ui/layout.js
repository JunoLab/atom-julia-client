'use babel'

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

function resetDockLayout () {
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

function resetLayout() {
  pane = getPanes()[0]
  for (let p of getPanes().slice(1)) {
    for (let item of p.getItems()) {
      p.moveItemToPane(item, pane)
    }
  }
}

function createLayout(layout,
                    pane = atom.workspace.getActivePane(),
                    vertical = true) {
  if (!layout) {
  } else if (layout instanceof Array) {
    let ps = [pane]
    for (let l of layout.slice(1)) {
      ps.push(vertical ? pane.splitDown() : pane.splitRight())
    }
    for (let i = 0; i < ps.length; i++) {
      createLayout(layout[i], ps[i], !vertical)
    }
  } else if (layout.layout) {
    layout.scale && pane.setFlexScale(layout.scale)
    createLayout(layout.layout, pane, vertical)
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
  resetDockLayout()
  createDockLayout()


  // let ps = []
  // for (let pane of [workspace(), cons(), plots()]) ps.push(pane.close())
  // Promise.all(ps).then(() => {
  //   resetLayout()
  //   createLayout([
  //     [null, {layout: workspace(), scale: 0.5}],
  //     {layout: [cons(), plots()], scale: 0.5}
  //   ])
  // })
}
