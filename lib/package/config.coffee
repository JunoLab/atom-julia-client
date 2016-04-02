{process: proc, terminal} = require '../connection'

config =
  launchOnStartup:
    type: 'boolean'
    default: proc.isBundled()
    description: 'Launch a Julia client when Atom starts.'
    order: 1
  juliaPath:
    type: 'string'
    default: if proc.isBundled() then '[bundle]' else 'julia'
    description: 'The location of the Julia binary.'
    order: 2
  notifications:
    type: 'boolean'
    default: true
    description: 'Enable notifications for evaluation.'
    order: 3
  errorsToConsole:
    type: 'boolean'
    default: false
    description: 'Show errors in console. If false use atom\'s nofitication UI'
    order: 4
  enableMenu:
    type: 'boolean'
    default: proc.isBundled()
    description: 'Show a Julia menu in the menu bar (requires restart).'
    order: 5
  enableToolBar:
    type: 'boolean'
    default: proc.isBundled()
    description: 'Show Julia icons in the tool bar.'
    order: 6

if process.platform != 'darwin'
  config.terminal =
    type: 'string'
    default: terminal.defaultTerminal()
    description: 'Command used to open a terminal.'
    order: 7

if process.platform == 'win32'
  config.enablePowershellWrapper =
    type: 'boolean'
    default: true
    description: 'Use a powershell wrapper to spawn Julia.
                  Necessary to enable interrupts.'
    order: 2.5

module.exports = config
