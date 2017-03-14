module.exports =

  openers: ['if','while','for','begin','function','macro','module','baremodule','type','immutable','struct','try','let','do','quote']
  reopeners: ['else','elseif','catch','finally']

  isKeywordScope: (ss) ->
    for scope in ss.slice(1) # skip 'source.julia'
      if scope.indexOf('keyword') > -1
        return true

  isCompFor: ({value, scopes}) ->
    value == 'for' and scopes[scopes.length-2] == 'meta.array.julia'

  forRange: (ed, range) ->
    scopes = []
    for l in ed.getGrammar().tokenizeLines ed.getTextInBufferRange range
      for t in l
        continue unless @isKeywordScope t.scopes
        continue if @isCompFor t
        {value} = t
        reopen = value in @reopeners
        if value is 'end' or reopen
          scopes.pop()
        if reopen or value in @openers
          scopes.push value
    scopes

  forLines: (ed, start, end) ->
    @forRange ed, [[start, 0], [end, Infinity]]
