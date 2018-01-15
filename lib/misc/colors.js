'use babel'

var styles = {
                'number': ['syntax--constant', 'syntax--numeric', 'syntax--julia'],
                'symbol': ['syntax--constant', 'syntax--other', 'syntax--symbol', 'syntax--julia'],
                'string': ['syntax--string', 'syntax--quoted', 'syntax--double', 'syntax--julia'],
                'macro': ['syntax--support', 'syntax--function', 'syntax--macro', 'syntax--julia'],
                'keyword': ['syntax--keyword', 'syntax--control', 'syntax--julia'],
                'funccall': ['syntax--support', 'syntax--function', 'syntax--julia'],
                'funcdef': ['syntax--entity', 'syntax--name', 'syntax--function'],
                'operator': ['syntax--operator', 'syntax--julia'],
                'comment': ['syntax--comment', 'syntax--julia'],
                'variable': ['syntax--julia'],
                'type': ['syntax--support', 'syntax--type', 'syntax--julia']
             }

export function getColors() {
  let grammar = atom.grammars.grammarForScopeName("source.julia")

  let styled = {}
  let color = {}
  let div = document.createElement('div')
  div.classList.add('editor', 'editor-colors', 'hidden')

  for (let style in styles) {
    let child = document.createElement('div')
    child.innerText = 'foo'
    child.classList.add(...styles[style])
    div.appendChild(child)
    styled[style] = child
  }

  document.body.appendChild(div)
  // wait till rendered
  for (let style in styles) {
    color[style] = rgb2hex(window.getComputedStyle(styled[style])['color'])
  }
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
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
  }
}
