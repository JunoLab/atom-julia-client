module.exports =
  activate: () ->
    @notificator = @ink.Notificator.create()
