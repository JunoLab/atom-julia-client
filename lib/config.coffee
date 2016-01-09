proc = require './connection/process'

config =
  juliaPath:
    type: 'string'
    default: proc.bundledExe() || 'julia'
    description: 'The location of the Julia binary'
    order: 1
  juliaArguments:
    type: 'string'
    default: '-q'
    description: 'Command-line arguments to pass to Julia'
    order: 2
  notifications:
    type: 'boolean'
    default: true
    description: 'Enable notifications for evaluation'
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
    description: 'Use a powershell wrapper to spawn Julia. Necessary to enable interrupts.'
    order: 2.1

module.exports = config
