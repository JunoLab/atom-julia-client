var fs = require('fs')
var fsextra = require('fs-extra')
var replace = require('replace-in-file')

function copyKeymaps () {
  let suffix = process.platform === 'darwin' ? '.cmd' : '.ctrl'
  fs.copyFileSync(__dirname + '/../keymaps/julia-client.cson' + suffix, __dirname + '/../keymaps/julia-client.cson')
}

function installKaTeX () {
  fsextra.copySync(__dirname + '/../node_modules/katex/dist/fonts', __dirname + '/../styles/fonts')
  fsextra.copySync(__dirname + '/../node_modules/katex/dist/katex.css', __dirname + '/../styles/katex.css')

  replace.sync({
    files: __dirname + '/../styles/katex.css',
    from:  /url\(fonts/g,
    to:    'url(atom:\/\/ink\/styles\/fonts'
  })
}

copyKeymaps()
installKaTeX()
