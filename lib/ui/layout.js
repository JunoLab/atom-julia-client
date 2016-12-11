'use babel'

function resetLayout() {
  pane = atom.workspace.getPanes()[0]
  for (let p of atom.workspace.getPanes().slice(1)) {
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
function cons() { return require('../runtime').console.c }
function plots() { return require('../runtime').plots.pane }

export function standard() {
  for (let pane of [workspace(), cons(), plots()]) pane.close()
  resetLayout()
  createLayout([
    [null, {layout: workspace(), scale: 0.5}],
    {layout: [cons(), plots()], scale: 0.5}
  ])
}
