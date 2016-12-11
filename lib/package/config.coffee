{terminal} = require '../connection'

config =
  juliaPath:
    type: 'string'
    default: 'julia'
    description: 'The location of the Julia binary.'
    order: 2
  juliaOptions:
    type: 'object'
    properties:
      optimisationLevel:
        title: 'Optimisation Level'
        description: 'Higher levels take longer to compile, but produce faster code.'
        type: 'integer'
        enum: [0, 1, 2, 3]
        default: 2
      deprecationWarnings:
        title: 'Deprecation Warnings'
        type: 'boolean'
        default: true
      bootMode:
        title: 'Boot Mode'
        type: 'string'
        enum: ['Basic', 'Cycler', 'Server']
        default: 'Basic'
    order: 3
  notifications:
    type: 'boolean'
    default: true
    description: 'Enable notifications for evaluation.'
    order: 4
  errorNotifications:
    type: 'boolean'
    default: true
    description: 'When evaluating a script, show errors in a notification as
                  well as in the console.'
    order: 5
  enableMenu:
    type: 'boolean'
    default: false
    description: 'Show a Julia menu in the menu bar (requires restart).'
    order: 6
  enableToolBar:
    type: 'boolean'
    default: false
    description: 'Show Julia icons in the tool bar (requires restart).'
    order: 7
  useStandardLayout:
    type: 'boolean'
    default: false
    description: 'Open the console, workspace and plot pane on start.'
    order: 7.5
  maximumConsoleSize:
    type: 'integer'
    description: "Limits the Console history's size."
    default: 10000
    order: 8
  resultsDisplayMode:
    type: 'string'
    default: 'inline'
    enum: [
      {value:'inline', description:'Float results next to code'}
      {value:'block', description:'Display results under code'}
    ]
    order: 10

if process.platform != 'darwin'
  config.terminal =
    type: 'string'
    default: terminal.defaultTerminal()
    description: 'Command used to open a terminal.'
    order: 9

if process.platform == 'win32'
  config.enablePowershellWrapper =
    type: 'boolean'
    default: true
    description: 'Use a powershell wrapper to spawn Julia.
                  Necessary to enable interrupts.'
    order: 3.5

module.exports = config
