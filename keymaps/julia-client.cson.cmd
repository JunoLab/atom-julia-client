###
@NOTE
It's best not to override default Atom keybindings if possible, and then
register only in Julia-scoped places (e.g. Julia-syntax buffer, console)
Any global commands should either be non-default or, ideally, prefixed with `C-J`.
###

# Debug operations
'.platform-darwin atom-text-editor[data-grammar="source julia"]:not(.mini),
  ink-terminal.julia-terminal,
  .ink-debugger-container':
  'f5': 'julia-debug:run-file'
  'cmd-f5': 'julia-debug:step-through-file'
  'shift-f5': 'julia-debug:stop-debugging'
  'f8': 'julia-debug:continue'
  'shift-f8': 'julia-debug:step-to-selected-line'
  'f9': 'julia-debug:toggle-breakpoint'
  'shift-f9': 'julia-debug:toggle-conditional-breakpoint'
  'f10': 'julia-debug:step-to-next-expression'
  'shift-f10': 'julia-debug:step-to-next-line'
  'f11': 'julia-debug:step-into'
  'shift-f11': 'julia-debug:step-out'

# Julia atom-text-editor
'.platform-darwin atom-text-editor[data-grammar="source julia"]':
  'cmd-enter': 'julia-client:run-block'
  'shift-enter': 'julia-client:run-and-move'
  'cmd-shift-enter': 'julia-client:run-all'
  'alt-enter': 'julia-client:run-cell'
  'alt-shift-enter': 'julia-client:run-cell-and-move'
  'cmd-shift-a': 'julia-client:select-block'
  'alt-down': 'julia-client:next-cell'
  'alt-up': 'julia-client:prev-cell'
  'cmd-j cmd-g': 'julia-client:goto-symbol'
  'cmd-j cmd-d': 'julia-client:show-documentation'
  'cmd-j cmd-m': 'julia-client:set-working-module'
  'cmd-j cmd-f': 'julia-client:format-code'

# Julia REPL
'.platform-darwin .julia-terminal':
  'ctrl-c': 'julia-client:interrupt-julia'
  'cmd-j cmd-m': 'julia-client:set-working-module'

# atom-workspace
'.platform-darwin atom-workspace':
  'cmd-j cmd-r': 'julia-client:open-external-REPL'
  'cmd-j cmd-o': 'julia-client:open-REPL'
  'cmd-j cmd-c': 'julia-client:clear-REPL'
  'cmd-j cmd-s': 'julia-client:start-julia'
  'cmd-j cmd-k': 'julia-client:kill-julia'
  'cmd-j cmd-p': 'julia-client:open-plot-pane'
  'cmd-j cmd-w': 'julia-client:open-workspace'
  'cmd-j cmd-,': 'julia-client:settings'
  'cmd-j cmd-e': 'julia-client:focus-last-editor'
  'cmd-j cmd-t': 'julia-client:focus-last-terminal'
  'cmd-j cmd-b': 'julia-client:return-from-goto'
