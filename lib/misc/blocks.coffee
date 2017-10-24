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
    multiline = false
    while mark < ed.getLastBufferRow()
      mark++
      l = @getLine ed, mark
      if multiline
        if l.match(/=#/)
          multiline = false
          mark++
        else
          continue
      break if @isStart l
      if @isEnd l
        if not (scopes.forLines(ed, start, mark-1).length is 0)
          end = mark
      else if not (@isBlank(l) or @isStart(l))
        end = mark
      else if l.match(/#=.*(?!=#)/)
        multiline = true
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
    docstring = false
    multicomment = false
    while to < ed.getLastBufferRow()
      l = @getLine(ed, to)
      if l.match(/^""".*(?!""")/) and not (docstring or multicomment)
        docstring = true
        to++
      else if l.match(/"""/)
        docstring = false
        to++
      else if l.match(/^#=.*(?!=#)/) and not (docstring or multicomment)
        multicomment = true
        to++
      else if l.match(/=#/)
        multicomment = false
        to++
      else if @isBlank(l) or multicomment or docstring
        to++
      else
        break
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
