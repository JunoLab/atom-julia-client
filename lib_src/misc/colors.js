'use babel'

export function getColors(selectors) {
  let grammar = atom.grammars.grammarForScopeName("source.julia")

  let styled = {}
  let color = {}
  let div = document.createElement('div')
  div.classList.add('editor', 'editor-colors', 'julia-syntax-color-selector')

  for (let style in selectors) {
    let child = document.createElement('span')
    child.innerText = 'foo'
    child.classList.add(...selectors[style])
    div.appendChild(child)
    styled[style] = child
  }

  document.body.appendChild(div)
  // wait till rendered?
  for (let style in selectors) {
    try {
      color[style] = rgb2hex(window.getComputedStyle(styled[style])['color'])
    } catch (e) {
      console.error(e)
    }
  }
  color['background'] = rgb2hex(window.getComputedStyle(div)['backgroundColor'])
  document.body.removeChild(div)

  return color
}

function rgb2hex(rgb) {
  if (rgb.search("rgb") == -1) {
    return rgb
  } else {
    rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/)
    function hex(x) {
      return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
  }
}
