var fs = require('fs')

function copyKeymaps () {
  let suffix = process.platform === 'darwin' ? '.cmd' : '.ctrl'
  fs.copyFileSync(__dirname + '/../keymaps/julia-client.cson' + suffix, __dirname + '/../keymaps/julia-client.cson')
}

copyKeymaps()
