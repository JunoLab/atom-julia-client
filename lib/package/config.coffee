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
        description: '`Basic` spins up a local Julia process on demand and is the most
                      robust option. The `Cycler` will keep three local Julia processes
                      around at all times to reduce downtime when a process exits.
                      `Remote` is similar to the `Start Remote Julia Process`
                      command but changes the default, so that evaluating a line
                      in the editor or pressing `Enter` in the REPL tab will start
                      a remote Julia process instead of a local one.'
        enum: ['Basic', 'Cycler', 'Remote']
        default: 'Cycler'
        order: 1
      optimisationLevel:
        title: 'Optimisation Level'
        description: 'Higher levels take longer to compile, but produce faster code.'
        type: 'integer'
        enum: [0, 1, 2, 3]
        default: 3
        order: 2
      deprecationWarnings:
        title: 'Deprecation Warnings'
        type: 'boolean'
        description: 'If disabled, hides deprecation warnings.'
        default: true
        order: 3
      numberOfThreads:
        title: 'Number of Threads'
        type: 'string'
        description: '`global` will use global setting, `auto` sets it to number of cores.'
        default: 'auto'
        order: 4
      startupArguments:
        title: 'Additional Julia Startup Arguments'
        type: 'array'
        description: '`-i`, `-O`, and `--depwarn` will be set by the above options
                      automatically, but can be overwritten here. Arguments are
                      comma-separated, and you should never need to quote
                      anything (even e.g. paths with spaces in them).'
        default: []
        items:
          type: 'string'
        order: 5
      externalProcessPort:
        title: 'Port for Communicating with the Julia Process'
        type: 'string'
        description: '`random` will use a new port each time, or enter an integer to set the port statically.'
        default: 'random'
        order: 6
      arguments:
        title: 'Arguments'
        type: 'array'
        description: 'Set `ARGS` to the following entries (comma-separated). Requires restart of Julia process.'
        default: []
        items:
          type: 'string'
        order: 7
      persistWorkingDir:
        title: 'Persist Working Directory'
        type: 'boolean'
        default: false
        order: 8
      workingDir:
        title: 'Working Directory'
        type: 'string'
        default: ''
        order: 9
      noAutoParenthesis:
        title: 'Don\'t Insert Parenthesis on Function Autocompletion'
        description: 'If enabled, Juno will not insert parenthesis after completing a function.'
        type: 'boolean'
        default: false
        order: 10
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
        order: 7
      openNewEditorWhenDebugging:
        title: 'Open New Editor When Debugging'
        type: 'boolean'
        default: false
        description: 'Opens a new editor tab when stepping into a new file instead
                      of reusing the current one (requires restart).'
        order: 8
      cellDelimiter:
        title: 'Cell Delimiter'
        type: 'array'
        default: ['##', '#---', '#%%', '# %%']
        description: 'Regular expressions for determining cell delimiters.'
        order: 9
      layouts:
        title: 'Layout'
        type: 'object'
        order: 10
        properties:
          console:
            title: 'Console'
            type: 'object'
            order: 1
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Console Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'bottom'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Console Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'no split'
                radio: true
                order: 2
          terminal:
            title: 'Terminal'
            type: 'object'
            order: 2
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Terminal Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'bottom'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Terminal Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'no split'
                radio: true
                order: 2
          workspace:
            title: 'Workspace'
            type: 'object'
            order: 3
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Workspace Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'center'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Workspace Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'right'
                radio: true
                order: 2
          documentation:
            title: 'Documentation Browser'
            type: 'object'
            order: 4
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Documentation Browser Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'center'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Documentation Browser Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'right'
                radio: true
                order: 2
          plotPane:
            title: 'Plot Pane'
            type: 'object'
            order: 5
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Plot Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'center'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Plot Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'right'
                radio: true
                order: 2
          debuggerPane:
            title: 'Debugger Pane'
            type: 'object'
            order: 6
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Debugger Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'right'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Debugger Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'no split'
                radio: true
                order: 2
          profiler:
            title: 'Profiler'
            type: 'object'
            order: 7
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Profiler Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'center'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Profiler Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'right'
                radio: true
                order: 2
          linter:
            title: 'Linter'
            type: 'object'
            order: 8
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Linter Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'bottom'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Linter Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'no split'
                radio: true
                order: 2
          defaultPanes:
            title: 'Default Panes'
            description: 'Specify panes that are opened by `Julia-Client:Default-Layout`.
                          Default location and splitting rule follow the settings above.'
            type: 'object'
            order: 9
            properties:
              console:
                title: 'Console'
                type: 'boolean'
                default: true
                order: 1
              workspace:
                title: 'Workspace'
                type: 'boolean'
                default: true
                order: 2
              documentation:
                title: 'Documentation Browser'
                type: 'boolean'
                default: true
                order: 3
              plotPane:
                title: 'Plot Pane'
                type: 'boolean'
                default: true
                order: 4
              debuggerPane:
                title: 'Debugger Pane'
                type: 'boolean'
                default: false
                order: 5
              linter:
                title: 'Linter'
                type: 'boolean'
                default: false
                order: 6
          openDefaultPanesOnStartUp:
            title: 'Open Default Panes on Startup'
            description: 'If enabled, opens panes specified above on startup.
                          If there are the panes restored from a previous window state,
                          the pane would still stay there.'
            type: 'boolean'
            default: true
            order: 10
  consoleOptions:
    type: 'object'
    order: 4
    properties:
      consoleStyle:
        title: 'Style (requires restart)'
        type: 'string'
        enum: ['REPL-based']
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
        description: 'The location of an executable shell. Set to `$SHELL` by default,
                      and if `$SHELL` isn\'t set then fallback to `bash` or `powershell.exe` (on Windows).'
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
        radio: true
        order: 8
      cursorBlink:
        title: 'Cursor Blink'
        type: 'boolean'
        default: false
        order: 9
      rendererType:
        title: 'Fallback Renderer'
        type: 'boolean'
        default: false
        description: 'Enable this if you\'re experiencing slowdowns in the built-in terminals.'
        order: 10
  remoteOptions:
    type: 'object'
    order: 5
    properties:
      remoteJulia:
        title: 'Command to execute Julia on the remote server'
        type: 'string'
        default: 'julia'
        order: 1
      tmux:
        title: 'Use a persistent tmux session'
        description: 'Requires tmux to be installed on the server you\'re connecting to.'
        type: 'boolean'
        default: false
        order: 2
      tmuxName:
        title: 'tmux session name'
        type: 'string'
        default: 'juno_tmux_session'
        order: 3
      agentAuth:
        title: 'Use SSH agent'
        description: 'Requires `$SSH_AUTH_SOCKET` to be set. Defaults to putty\'s pageant on Windows.'
        type: 'boolean'
        default: true
        order: 4
      forwardAgent:
        title: 'Forward SSH agent'
        type: 'boolean'
        default: true
        order: 5

  firstBoot:
    type: 'boolean'
    default: true
    order: 99

if process.platform != 'darwin'
  config.consoleOptions.properties.whitelistedKeybindingsREPL.default =
    ['Ctrl-C', 'Ctrl-J', 'Ctrl-K', 'Ctrl-E', 'Ctrl-V', 'Ctrl-M']

if process.platform == 'darwin'
  config.consoleOptions.properties.macOptionIsMeta =
    title: 'Use Option as Meta'
    type: 'boolean'
    default: false
    order: 5.5

if process.platform == 'win32'
  config.juliaOptions.properties.enablePowershellWrapper =
    title: 'Enable Powershell Wrapper'
    type: 'boolean'
    default: true
    description: 'If enabled, use a Powershell wrapper to spawn Julia. Necessary to enable interrupts.'
    order: 11

module.exports = config
