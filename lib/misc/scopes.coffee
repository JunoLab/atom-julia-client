module.exports =

  openers: ['if','while','for','begin','function','macro','module','baremodule',
            'type','immutable','struct','mutable struct','try','let','do','quote',
            'abstract type', 'primitive type']
  reopeners: ['else','elseif','catch','finally']

  isKeywordScope: (ss) ->
    for scope in ss.slice(1) # skip 'source.julia'
      if scope.indexOf('keyword') > -1
        return true

  isStringScope: (scopes) ->
    for scope in scopes
      if scope.indexOf('string') > -1
        return true
    return false

  forRange: (ed, range) ->
    scopes = []
    n_parens = 0
    n_brackets = 0
    for l in atom.grammars.grammarForScopeName("source.julia").tokenizeLines ed.getTextInBufferRange range
      for t in l
        {value} = t

        if not @isStringScope(t.scopes)
          if n_parens > 0 and value == ')'
            n_parens -= 1
            scopes.splice(scopes.lastIndexOf('paren'), 1)
            continue
          if n_brackets > 0 and value == ']'
            n_brackets -= 1
            scopes.splice(scopes.lastIndexOf('bracket'), 1)
            continue
          if value == '('
            n_parens += 1
            scopes.push 'paren'
            continue
          if value == '['
            n_brackets += 1
            scopes.push 'bracket'
            continue

        continue unless @isKeywordScope t.scopes
        continue unless n_parens == 0 and n_brackets == 0

        reopen = value in @reopeners
        if value is 'end' or reopen
          scopes.pop()
        if reopen or value in @openers
          scopes.push value
    scopes

  forLines: (ed, start, end) ->
    @forRange ed, [[start, 0], [end, Infinity]]
