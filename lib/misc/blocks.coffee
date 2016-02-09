# TODO: scan for scopes
# TODO: docstrings

module.exports =

  getLine: (ed, l) ->
    ed.getTextInBufferRange [[l, 0], [l, Infinity]]

  isBlank: (l) -> l.match /^\s*(#.*)?$/
  isEnd: (l) -> l.match /^end\b/
  isCont: (l) -> l.match /^(else|elseif|catch|finally)\b/
  isStart: (l) -> not (l.match(/^\s/) or @isBlank(l) or @isEnd(l) or @isCont(l))

  walkBack: (ed, row) ->
    while row > 0 and not @isStart @getLine ed, row
      row--
    row

  walkForward: (ed, row) ->
    mark = row
    while mark < ed.getLineCount() - 1
      mark++
      l = @getLine ed, mark
      break if @isStart l
      row = mark if not (@isStart(l) or @isBlank(l))
    row

  getOne: (ed, {row}) ->
    start = @walkBack ed, row
    end = @walkForward ed, start
    if start <= row <= end
      text: ed.getTextInRange [[start, 0], [end, Infinity]]
      row: start

  # TODO: trim blank lines
  getSelection: (ed, sel) ->
    text: sel.getText()
    row: sel.getBufferRange().start.row

  get: (ed) ->
    blocks = for sel in ed.getSelections()
      if sel.getBufferRange().start.isEqual sel.getBufferRange().end
        @getOne ed, sel.getHeadBufferPosition()
      else
        @getSelection ed, sel
    console.log block for block in blocks.filter((x)->x?.text.trim())
