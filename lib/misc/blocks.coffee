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
    while mark < ed.getLastBufferRow()
      mark++
      l = @getLine ed, mark
      break if @isStart l
      if @isEnd l
        if not (scopes.forLines(ed, start, mark-1).length is 0)
          end = mark
      else if not (@isBlank(l) or @isStart(l))
        end = mark
    end

  getRange: (ed, row) ->
    start = @walkBack ed, row
    end = @walkForward ed, start
    if start <= row <= end
      [[start, 0], [end, Infinity]]

  getSelection: (ed, sel) ->
    {start, end} = sel.getBufferRange()
    range = [[start.row, start.column], [end.row, end.column]]
    while @isBlank(@getLine(ed, range[0][0])) and range[0][0] <= range[1][0]
      range[0][0]++
      range[0][1] = 0
    while @isBlank(@getLine(ed, range[1][0])) and range[1][0] >= range[0][0]
      range[1][0]--
      range[1][1] = Infinity
    range

  moveNext: (ed, sel, [_, [row]]) ->
    # Ensure enough room at the end of the buffer
    while (last = ed.getLastBufferRow()) < row+2
      break unless last is row or @isBlank @getLine ed, last
      sel.setBufferRange [[last, Infinity], [last, Infinity]]
      sel.insertText '\n'
    # Move the cursor
    to = row + 1
    while to < ed.getLastBufferRow() and @isBlank @getLine ed, to
      to++
    to = @walkForward ed, to
    sel.setBufferRange [[to, Infinity], [to, Infinity]]

  getRanges: (ed) ->
    ranges = for sel in ed.getSelections()
      selection: sel
      range:
        if sel.isEmpty()
          @getRange ed, sel.getHeadBufferPosition().row
        else
          @getSelection ed, sel
    ranges.filter(({range})->range? and ed.getTextInBufferRange(range).trim())

  get: (ed) ->
    for {range, selection} in @getRanges ed
      range: range
      selection: selection
      line: range[0][0]
      text: ed.getTextInBufferRange range

  select: (ed = atom.workspace.getActiveTextEditor()) ->
    return unless ed?
    ed.mutateSelectedText (selection) =>
      {row} = selection.getHeadBufferPosition()
      if (range = @getRange ed, row)
        [start, [row]] = range
        selection.setBufferRange [start, [row+1, 0]]
