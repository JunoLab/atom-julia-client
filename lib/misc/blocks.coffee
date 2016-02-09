# TODO: docstrings

module.exports =

  openers: ['if','while','for','begin','function','macro','module','baremodule','type','immutable','try','let']
  reopeners: ['else','elseif','catch','finally']

  @isKeywordScope: (ss) ->
    for scope in ss.slice(1) # skip 'source.julia'
      if scope.indexOf('keyword') > -1
        return true

  scopesForRange: (ed, range) ->
    scopes = []
    for l in ed.getGrammar().tokenizeLines ed.getTextInBufferRange range
      for t in l
        continue unless @isKeywordScope t.scopes
        {value} = t
        reopen = value in @reopeners
        if value is 'end' or reopen
          scopes.pop()
        if reopen or value in @openers
          scopes.push value
    scopes

  scopesForLines: (ed, start, end) ->
    @scopesForRange ed, [[start, 0], [end, Infinity]]

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
        if not (@scopesForLines(ed, start, mark-1).length is 0)
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
    [start, end] = sel.getBufferRange()
    [[start.row, start.column], [end.row, end.column]]

  getRanges: (ed) ->
    ranges = for sel in ed.getSelections()
      if sel.getBufferRange().isEmpty()
        @getRange ed, sel.getHeadBufferPosition().row
      else
        @getSelection ed, sel
    ranges.filter((range)->range? and ed.getTextInBufferRange(range).trim())
