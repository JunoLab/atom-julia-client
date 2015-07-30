module.exports =
  activate: ->
    @cmd = atom.commands.add 'atom-workspace',
      "julia-client:clear-console": =>
        @c?.clear()

  deactivate: ->
    @cmd.dispose()

  create: ->
    return unless @ink?
    if not @c?
      @c = @ink.console.create()
      @c.view.getTitle = -> "Julia"
      @c.onEval (ed) =>
        @eval ed
      @c.onClear =>
        @c.input()
        @c.view.focusInput true
      @c.input()
    @c

  toggle: -> @create()?.toggle()

  eval: (ed) ->
    if ed.getText()
      @c.done()
      @c.out ed.getText()
      @c.input()
