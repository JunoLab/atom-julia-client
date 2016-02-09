# TODO: docstrings

scopes = require './scopes'

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

  walkForward: (ed, start) ->
    mark = end = start
    while mark < ed.getLineCount() - 1
      mark++
      l = @getLine ed, mark
      break if @isStart l
      if @isEnd l
        if not (scopes.ForLines(ed, start, mark-1).length is 0)
          end = mark
      else if not (@isBlank(l) or @isStart(l))
        end = mark
    end

  getRange: (ed, row) ->
    start = @walkBack ed, row
    end = @walkForward ed, start
    if start <= row <= end
      [[start, 0], [end, Infinity]]

  # TODO: trim blank lines
  getSelection: (ed, sel) ->
    {start, end} = sel.getBufferRange()
    [[start.row, start.column], [end.row, end.column]]

  getRanges: (ed) ->
    ranges = for sel in ed.getSelections()
      if sel.getBufferRange().isEmpty()
        @getRange ed, sel.getHeadBufferPosition().row
      else
        @getSelection ed, sel
    ranges.filter((range)->range? and ed.getTextInBufferRange(range).trim())

  get: (ed) ->
    for range in @getRanges ed
      range: range
      line: range[0][0]
      text: ed.getTextInBufferRange range
