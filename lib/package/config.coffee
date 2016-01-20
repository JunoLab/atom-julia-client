proc = require '../connection/process'

config =
  launchOnStartup:
    type: 'boolean'
    default: false
    description: 'Launch a Julia client when Atom starts.'
    order: 1
  juliaPath:
    type: 'string'
    default: proc.bundledExe() || 'julia'
    description: 'The location of the Julia binary.'
    order: 2
  notifications:
    type: 'boolean'
    default: true
    description: 'Enable notifications for evaluation.'
    order: 3

if process.platform != 'darwin'
  config.terminal =
    type: 'string'
    default:
      if process.platform == 'win32'
        'cmd /C start cmd /C'
      else
        'x-terminal-emulator -e'
    description: 'Command used to open a terminal.'
    order: 4

if process.platform == 'win32'
  config.enablePowershellWrapper =
    type: 'boolean'
    default: true
    description: 'Use a powershell wrapper to spawn Julia.
                  Necessary to enable interrupts.'
    order: 3.5

module.exports = config
