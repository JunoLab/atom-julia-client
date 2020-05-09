/** @babel */

import SelectList from 'atom-select-list'

/**
 * @type {SelectList}
 */
let selector
let panel, ink

export function activate (_ink) {
  ink = _ink
  selector = new SelectList({
    items: [],
    elementForItem
  })
  selector.element.classList.add('command-palette', 'julia-client-selector')
  panel = atom.workspace.addModalPanel({ item: selector.element })
}

function elementForItem (item, { selected }) {
  const view = document.createElement('li')
  if (selected) view.classList.add('active')
  const name = (item.primary) ? item.primary.toString() : item.toString()
  const primary = ink.matchHighlighter.highlightMatches(name, selector.getFilterQuery())
  view.appendChild(primary)
  if (item.secondary) {
    const secondary = document.createElement('div')
    secondary.classList.add('secondary-line', 'path')
    secondary.innerText = item.secondary
    view.classList.add('two-lines')
    primary.classList.add('primary-line')
    view.append(secondary)
  }
  return view
}

export function show (items, { active, emptyMessage, errorMessage, infoMessage, allowCustom } = {}) {
  selector.update({
    items: [],
    query: '',
    loadingMessage: 'Loading ...',
  })
  const lastFocusedPane = atom.workspace.getActivePane()
  panel.show()
  selector.focus()
  let confirmed = false
  return new Promise((resolve, reject) => {
    // HACK:
    // we can't pass those callback functions to `update` while atom-select-list's document says they can be ...
    selector.props.didConfirmSelection = (item) => {
      confirmed = true
      selector.cancelSelection()
      resolve(item)
    }
    selector.props.didConfirmEmptySelection = () => {
      confirmed = true
      selector.cancelSelection()
      const query = selector.getQuery()
      if (allowCustom && query.length > 0) {
        resolve(query)
      } else {
        resolve()
      }
    }
    selector.props.didCancelSelection = () => {
      panel.hide()
      lastFocusedPane.activate()
      const query = selector.getQuery()
      if (!confirmed) {
        if (allowCustom && query.length > 0) {
          resolve(query)
        } else {
          resolve()
        }
      }
    }
    // for handling `Promise`
    function updateSelector (items) {
      selector.props.filterKeyForItem = (items.length > 0 && items[0] instanceof Object) ?
        item => item.primary : item => item
      selector.update({
        items,
        emptyMessage,
        errorMessage,
        infoMessage,
        loadingMessage: ''
      })
      if (active) selectActiveItem(selector, items, active)
    }
    if (items.constructor == Promise) {
      items.then(items => {
        updateSelector(items)
      }).catch(err => {
        reject(err)
        selector.cancelSelection()
      })
    } else {
      updateSelector(items)
    }
  })
}

function selectActiveItem (selector, items, active) {
  const index = (active instanceof Number) ? active :
    (active instanceof Function) ? items.findIndex(active) :
    (items.length > 0 && items[0].primary) ? items.findIndex(item => item.primary === active) :
    items.indexOf(active)
  if (index === -1) return // do nothing
  selector.selectIndex(index)
}
