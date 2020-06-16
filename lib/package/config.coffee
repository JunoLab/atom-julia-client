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
    collapsed: true
    properties:
      bootMode:
        title: 'Boot Mode'
        type: 'string'
        description: '`Basic` spins up a local Julia process on demand and is the most
                      robust option. The `Cycler` will keep a few local Julia processes
                      around at all times to reduce downtime when a process exits.
                      `External Terminal` opens an external terminal and connects it to Juno,
                      much like the `Julia Client: Connect Terminal` command.
                      `Remote` is similar to the `Julia Client: Start Remote Julia Process`
                      command but changes the default, so that evaluating a line
                      in the editor or pressing `Enter` in the REPL tab will start
                      a remote Julia process instead of a local one.'
        enum: ['Basic', 'Cycler', 'External Terminal', 'Remote']
        default: 'Basic'
        radio: true
        order: 1
      packageServer:
        title: 'Package Server'
        type: 'string'
        description: 'Julia package server. Set\'s the `JULIA_PKG_SERVER` environment
                      variable *before* starting a Julia process. Leave this empty to
                      use the systemwide default.
                      Requires a restart of the Julia process.'
        default: ''
        order: 1.5
      optimisationLevel:
        title: 'Optimisation Level'
        description: 'Higher levels take longer to compile, but produce faster code.'
        type: 'integer'
        enum: [0, 1, 2, 3]
        default: 2
        radio: true
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
      fuzzyCompletionMode:
        title: 'Fuzzy Completion Mode'
        description:
          '''
          If `true`, in-editor auto-completions are generated based on fuzzy (i.e. more permissive) matches,
          otherwise based on strict matches as in REPL.
          ***NOTE***: this setting doesn't affect completions in REPL,
          and so in-REPL completions will still work as usual (i.e. based on strict matches and will complete eagerly).
          '''
        type: 'boolean'
        default: true
        order: 10
      autoCompletionSuggestionPriority:
        title: 'Auto-Completion Suggestion Priority'
        description:
          '''
          Specify the sort order of auto-completion suggestions provided by Juno.
          Note the default providers like snippets have priority of `1`.
          Requires Atom restart to take an effect.
          '''
        type: 'integer'
        default: 3
        order: 11
      noAutoParenthesis:
        title: 'Don\'t Insert Parenthesis on Function Auto-completion'
        description: 'If enabled, Juno will not insert parenthesis after completing a function.'
        type: 'boolean'
        default: false
        order: 12
      formatOnSave:
        title: 'Format the current editor when saving'
        description: 'If enabled, Juno will format the current editor on save if a Julia session is running.'
        type: 'boolean'
        default: false
        order: 13
      formattingOptions:
        title: 'Formatting Options'
        description:
          '''
          ⚠ This config is deprecated. In order to specify
          [Formatting Options](https://domluna.github.io/JuliaFormatter.jl/dev/#Formatting-Options-1),
          use `.JuliaFormatter.toml` configuration file instead.
          See the ["Configuration File" section](https://domluna.github.io/JuliaFormatter.jl/stable/config/)
          in JuliaFormatter.jl's documentation for more details.
          '''
        type: 'object'
        order: 14
        collapsed: true
        properties:
          mock: # NOTE: otherwise the deprecated description doesn't show up
            title: "mock (doesn't have any effect)"
            type: 'boolean'
            default: false

  uiOptions:
    title: 'UI Options'
    type: 'object'
    order: 3
    collapsed: true
    properties:
      resultsDisplayMode:
        title: 'Result Display Mode'
        type: 'string'
        default: 'inline'
        enum: [
          {value:'inline', description:'Float results next to code'}
          {value:'block', description:'Display results under code'}
          {value:'console', description:'Display results in the REPL'}
        ]
        order: 1
      scrollToResult:
        title: 'Scroll to Inline Results'
        type: 'boolean'
        default: false
        order: 2
      docsDisplayMode:
        title: 'Documentation Display Mode'
        type: 'string'
        default: 'pane'
        enum: [
          {value: 'inline', description: 'Show documentation in the editor'}
          {value: 'pane', description: 'Show documentation in the documentation pane'}
        ]
        order: 3
      errorNotifications:
        title: 'Error Notifications'
        type: 'boolean'
        default: true
        description: 'When evaluating a script, show errors in a notification as
                      well as in the REPL.'
        order: 4
      errorInRepl:
        title: 'Show Errors in REPL (Inline Evaluation)'
        type: 'boolean'
        default: false
        description: 'If enabled, Juno always shows errors in the REPL when using inline evaluation.'
        order: 5
      enableMenu:
        title: 'Enable Menu'
        type: 'boolean'
        default: false
        description: 'Show a Julia menu in the menu bar (requires restart).'
        order: 6
      enableToolBar:
        title: 'Enable Toolbar'
        type: 'boolean'
        default: false
        description: 'Show Julia icons in the tool bar (requires restart).'
        order: 7
      usePlotPane:
        title: 'Enable Plot Pane'
        type: 'boolean'
        default: true
        description: 'Show plots in Atom.'
        order: 8
      maxNumberPlots:
        title: 'Maximum Number of Plots in History'
        type: 'number'
        default: 50
        description: 'Increasing this number may lead to high memory consumption and poor performance.'
        order: 9
      openNewEditorWhenDebugging:
        title: 'Open New Editor When Debugging'
        type: 'boolean'
        default: false
        description: 'Opens a new editor tab when stepping into a new file instead
                      of reusing the current one (requires restart).'
        order: 10
      cellDelimiter:
        title: 'Cell Delimiter'
        type: 'array'
        default: ['##(?!#)', '#---', '#\\s?%%']
        description: 'Regular expressions for determining cell delimiters.'
        order: 11
      highlightCells:
        title: 'Highlight Cells'
        type: 'boolean'
        description: 'Customize the appearence of Juno\'s cell highlighting by
                      adding styles for `.line.julia-current-cell` or
                      `.line-number.julia-current-cell` to your personal
                      stylesheet.'
        default: true
        order: 12
      layouts:
        title: 'Layout Options'
        type: 'object'
        order: 13
        collapsed: true
        properties:
          console:
            title: 'REPL'
            type: 'object'
            order: 1
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of REPL Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'bottom'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of REPL Pane'
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
          outline:
            title: 'Outline'
            type: 'object'
            order: 9
            collapsed: true
            properties:
              defaultLocation:
                title: 'Default location of Outline Pane'
                type: 'string'
                enum: ['center', 'left', 'bottom', 'right']
                default: 'left'
                radio: true
                order: 1
              split:
                title: 'Splitting rule of Outline Pane'
                type: 'string'
                enum: ['no split', 'left', 'up', 'right', 'down']
                default: 'down'
                radio: true
                order: 2
          defaultPanes:
            title: 'Default Panes'
            description: 'Specify panes that are opened by `Julia Client: Restore Default Layout`.
                          The location and splitting rule of each pane follow the settings above.'
            type: 'object'
            order: 10
            properties:
              console:
                title: 'REPL'
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
              outline:
                title: 'Outline'
                type: 'boolean'
                default: false
                order: 7
          openDefaultPanesOnStartUp:
            title: 'Open Default Panes on Startup'
            description: 'If enabled, opens panes specified above on startup.
                          Note a layout deserialized from a previous window state
                          would be modified by that, i.e.: disable this if you want
                          to keep the deserialized layout.'
            type: 'boolean'
            default: true
            order: 11

  consoleOptions:
    type: 'object'
    title: 'Terminal Options'
    order: 4
    collapsed: true
    properties:
      maximumConsoleSize:
        title: 'Scrollback Buffer Size'
        type: 'integer'
        default: 10000
        order: 1
      prompt:
        title: 'Terminal Prompt'
        type: 'string'
        default: 'julia>'
        order: 2
      shell:
        title: 'Shell'
        type: 'string'
        default: terminal.defaultShell()
        description: 'The location of an executable shell. Set to `$SHELL` by default,
                      and if `$SHELL` isn\'t set then fallback to `bash` or `powershell.exe` (on Windows).'
        order: 3
      terminal:
        title: 'Terminal'
        type: 'string'
        default: terminal.defaultTerminal()
        description: 'Command used to open an external terminal.'
        order: 4
      whitelistedKeybindingsREPL:
        title: 'Whitelisted Keybindings for the Julia REPL'
        type: 'array'
        default: ['Ctrl-C', 'Ctrl-S', 'F5', 'F8', 'F9', 'F10', 'F11', 'Shift-F5', 'Shift-F8', 'Shift-F9', 'Shift-F10', 'Shift-F11']
        description: 'The listed keybindings are not handled by the REPL and instead directly passed to Atom.'
        order: 5
      whitelistedKeybindingsTerminal:
        title: 'Whitelisted Keybindings for Terminals'
        type: 'array'
        default: []
        description: 'The listed keybindings are not handled by any terminals and instead directly passed to Atom.'
        order: 6
      cursorStyle:
        title: 'Cursor Style'
        type: 'string'
        enum: ['block', 'underline', 'bar']
        default: 'block'
        radio: true
        order: 7
      cursorBlink:
        title: 'Cursor Blink'
        type: 'boolean'
        default: false
        order: 8
      terminalRendererType:
        title: 'Terminal Renderer'
        type: 'string'
        enum: ['webgl', 'canvas', 'dom']
        default: 'webgl'
        radio: true
        description: 'The `webgl` renderer is fastest, but is still experimental. `canvas` performs well
                      in many cases, while `dom` is a slow falback. Note that it\'s not possible
                      to hot-swap to the `webgl` renderer.'
        order: 9
      linkModifier:
        title: 'Ctrl/Cmd modifier for link activation'
        type: 'boolean'
        default: true
        order: 10

  remoteOptions:
    type: 'object'
    order: 5
    collapsed: true
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

  juliaSyntaxScopes:
    title: 'Julia Syntax Scopes'
    description:
      'The listed syntax scopes (comma separated) will be recoginized as Julia files.
       You may have to restart Atom to take an effect.\n
       **DO NOT** edit this unless you\'re sure about the effect.'
    type: 'array'
    default: ['source.julia', 'source.weave.md', 'source.weave.latex']
    order: 6

  disableProxy:
    title: 'Disable System Proxy for Child Processes'
    description:
      'This unsets the `HTTP_PROXY` and `HTTPS_PROXY` environment variables in all integrated
       terminals. Try this option if you\'re experiencing issues when installing Julia packages
       in Juno.'
    type: 'boolean'
    default: false
    order: 7

  firstBoot:
    type: 'boolean'
    default: true
    order: 99

  currentVersion:
    type: 'string'
    default: '0.0.0'
    order: 100

if process.platform != 'darwin'
  config.consoleOptions.properties.whitelistedKeybindingsREPL.default =
    ['Ctrl-C', 'Ctrl-J', 'Ctrl-K', 'Ctrl-E', 'Ctrl-V', 'Ctrl-M', 'F5', 'F8', 'F9',
     'F10', 'F11', 'Shift-F5', 'Shift-F8', 'Shift-F9', 'Shift-F10', 'Shift-F11']

if process.platform == 'darwin'
  config.consoleOptions.properties.macOptionIsMeta =
    title: 'Use Option as Meta'
    type: 'boolean'
    default: false
    order: 5.5

module.exports = config
