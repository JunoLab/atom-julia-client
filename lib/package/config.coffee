{terminal} = require '../connection'

config =
  juliaPath:
    type: 'string'
    default: 'julia'
    description: 'The location of the Julia binary.'
    order: 1
  juliaOptions:
    type: 'object'
    order: 2
    properties:
      bootMode:
        title: 'Boot Mode'
        type: 'string'
        enum: ['Basic', 'Cycler']
        default: 'Cycler'
        order: 1
      arguments:
        title: 'Arguments'
        type: 'array'
        description: 'Set `ARGS` to the following entries.'
        default: []
        items:
          type: 'string'
        order: 2
      optimisationLevel:
        title: 'Optimisation Level'
        description: 'Higher levels take longer to compile, but produce faster code.'
        type: 'integer'
        enum: [0, 1, 2, 3]
        default: 3
        order: 3
      deprecationWarnings:
        title: 'Deprecation Warnings'
        type: 'boolean'
        description: 'Hides deprecation warnings if disabled.'
        default: true
        order: 4
      numberOfThreads:
        title: 'Number of Threads'
        type: 'string'
        description: '`global` will use global setting, `auto` sets it to number of cores.'
        default: 'auto'
        order: 5
      startupArguments:
        title: 'Additional Julia Startup Arguments'
        type: 'array'
        description: '`-i`, `-O`, and `--depwarn` will be set by the above options
                      automatically.'
        default: []
        items:
          type: 'string'
        order: 6
      externalProcessPort:
            title: 'Port of external Julia process'
            type: 'string'
            description: '`random` will use a new port each time, or enter an integer to set the port statically.'
            default: 'random'
            order: 7
  uiOptions:
    title: 'UI Options'
    type: 'object'
    order: 3
    properties:
      resultsDisplayMode:
        title: 'Result Display Mode'
        type: 'string'
        default: 'inline'
        enum: [
          {value:'inline', description:'Float results next to code'}
          {value:'block', description:'Display results under code'}
          {value:'console', description:'Display results in the console'}
        ]
        order: 1
      docsDisplayMode:
        title: 'Documentation Display Mode'
        type: 'string'
        default: 'pane'
        enum: [
          {value: 'inline', description: 'Show documentation in the editor'}
          {value: 'pane', description: 'Show documentation in the documentation pane'}
        ]
        order: 2
      notifications:
        title: 'Notifications'
        type: 'boolean'
        default: true
        description: 'Enable notifications for evaluation.'
        order: 3
      errorNotifications:
        title: 'Error Notifications'
        type: 'boolean'
        default: true
        description: 'When evaluating a script, show errors in a notification as
                      well as in the console.'
        order: 4
      enableMenu:
        title: 'Enable Menu'
        type: 'boolean'
        default: false
        description: 'Show a Julia menu in the menu bar (requires restart).'
        order: 5
      enableToolBar:
        title: 'Enable Toolbar'
        type: 'boolean'
        default: false
        description: 'Show Julia icons in the tool bar (requires restart).'
        order: 6
      usePlotPane:
        title: 'Enable Plot Pane'
        type: 'boolean'
        description: 'Show plots in Atom.'
        default: true
        order: 6.5
      openNewEditorWhenDebugging:
        title: 'Open New Editor When Debugging'
        type: 'boolean'
        default: false
        description: 'Opens a new editor tab when stepping into a new file instead
                      of reusing the current one (requires restart).'
        order: 7
      cellDelimiter:
        title: 'Cell Delimiter'
        type: 'array'
        default: ['##', '#---', '#%%', '# %%']
        description: 'Regular expressions for determining cell delimiters.'
        order: 8
  consoleOptions:
    type: 'object'
    order: 4
    properties:
      consoleStyle:
        title: 'Style (requires restart)'
        type: 'string'
        enum: ['REPL-based', 'Legacy']
        default: 'REPL-based'
        order: 1
      maximumConsoleSize:
        title: 'Scrollback Buffer Size'
        type: 'integer'
        default: 10000
        order: 2
      prompt:
        title: 'Terminal Prompt'
        type: 'string'
        default: 'julia>'
        order: 3
      shell:
        title: 'Shell'
        type: 'string'
        default: terminal.defaultShell()
        description: 'Shell. Defaults to `$SHELL`.'
        order: 4
      terminal:
        title: 'Terminal'
        type: 'string'
        default: terminal.defaultTerminal()
        description: 'Command used to open an external terminal.'
        order: 5
      whitelistedKeybindingsREPL:
        title: 'Whitelisted Keybindings for the Julia REPL'
        type: 'array'
        default: ['Ctrl-C']
        description: 'The listed keybindings are not handled by the REPL and instead directly passed to Atom.'
        order: 6
      whitelistedKeybindingsTerminal:
        title: 'Whitelisted Keybindings for Terminals'
        type: 'array'
        default: []
        description: 'The listed keybindings are not handled by any terminals and instead directly passed to Atom.'
        order: 7
      cursorStyle:
        title: 'Cursor Style'
        type: 'string'
        enum: ['block', 'underline', 'bar']
        default: 'block'
        description: 'Only applied to new terminals.'
        order: 8

  firstBoot:
    type: 'boolean'
    default: true
    order: 99

if process.platform != 'darwin'
  config.consoleOptions.properties.whitelistedKeybindingsREPL.default = ['Ctrl-C', 'Ctrl-J', 'Ctrl-K', 'Ctrl-E', 'Ctrl-V']

if process.platform == 'win32'
  config.enablePowershellWrapper =
    title: 'Enable Powershell Wrapper'
    type: 'boolean'
    default: true
    description: 'Use a powershell wrapper to spawn Julia.
                  Necessary to enable interrupts.'
    order: 2.5

module.exports = config
