_ = require 'underscore-plus'

# Implementation identical to https://github.com/atom/highlights/blob/master/src/highlights.coffee,
# but uses an externally provided grammar.
module.exports =
  # Highlights some `text` according to the specified `grammar`.
  highlight: (text, grammar, {scopePrefix, block}={}) ->
    scopePrefix ?= ''
    block ?= false
    lineTokens = grammar.tokenizeLines(text)

    # Remove trailing newline
    if lineTokens.length > 0
      lastLineTokens = lineTokens[lineTokens.length - 1]

      if lastLineTokens.length is 1 and lastLineTokens[0].value is ''
        lineTokens.pop()

    html = '<code class="editor editor-colors">'
    for tokens in lineTokens
      scopeStack = []
      html += "<#{if block then "div" else "span"} class=\"line\">"
      for {value, scopes} in tokens
        value = ' ' unless value
        html = @updateScopeStack(scopeStack, scopes, html, scopePrefix)
        html += "<span>#{@escapeString(value)}</span>"
      html = @popScope(scopeStack, html) while scopeStack.length > 0
      html += "</#{if block then "div" else "span"}>"
    html += '</code>'
    html

  escapeString: (string) ->
    string.replace /[&"'<> ]/g, (match) ->
      switch match
        when '&' then '&amp;'
        when '"' then '&quot;'
        when "'" then '&#39;'
        when '<' then '&lt;'
        when '>' then '&gt;'
        when ' ' then '&nbsp;'
        else match

  updateScopeStack: (scopeStack, desiredScopes, html, scopePrefix) ->
    excessScopes = scopeStack.length - desiredScopes.length
    if excessScopes > 0
      html = @popScope(scopeStack, html) while excessScopes--

    # pop until common prefix
    for i in [scopeStack.length..0]
      break if _.isEqual(scopeStack[0...i], desiredScopes[0...i])
      html = @popScope(scopeStack, html)

    # push on top of common prefix until scopeStack is desiredScopes
    for j in [i...desiredScopes.length]
      html = @pushScope(scopeStack, desiredScopes[j], html, scopePrefix)

    html

  pushScope: (scopeStack, scope, html, scopePrefix) ->
    scopeStack.push(scope)
    className = scopePrefix + scope.replace(/\.+/g, " #{scopePrefix}")
    html += "<span class=\"#{className}\">"

  popScope: (scopeStack, html) ->
    scopeStack.pop()
    html += '</span>'
