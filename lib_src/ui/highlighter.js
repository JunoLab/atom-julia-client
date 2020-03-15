/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import _ from 'underscore-plus';

// Implementation identical to https://github.com/atom/highlights/blob/master/src/highlights.coffee,
// but uses an externally provided grammar.
export default {
  // Highlights some `text` according to the specified `grammar`.
  highlight(text, grammar, {scopePrefix, block}={}) {
    if (scopePrefix == null) { scopePrefix = ''; }
    if (block == null) { block = false; }
    const lineTokens = grammar.tokenizeLines(text);

    // Remove trailing newline
    if (lineTokens.length > 0) {
      const lastLineTokens = lineTokens[lineTokens.length - 1];

      if ((lastLineTokens.length === 1) && (lastLineTokens[0].value === '')) {
        lineTokens.pop();
      }
    }

    let html = '<code class="editor editor-colors">';
    for (let tokens of lineTokens) {
      const scopeStack = [];
      html += `<${block ? "div" : "span"} class=\"line\">`;
      for (let {value, scopes} of tokens) {
        if (!value) { value = ' '; }
        html = this.updateScopeStack(scopeStack, scopes, html, scopePrefix);
        html += `<span>${this.escapeString(value)}</span>`;
      }
      while (scopeStack.length > 0) { html = this.popScope(scopeStack, html); }
      html += `</${block ? "div" : "span"}>`;
    }
    html += '</code>';
    return html;
  },

  escapeString(string) {
    return string.replace(/[&"'<> ]/g, function(match) {
      switch (match) {
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case ' ': return '&nbsp;';
        default: return match;
      }
    });
  },

  updateScopeStack(scopeStack, desiredScopes, html, scopePrefix) {
    let i;
    let asc;
    let excessScopes = scopeStack.length - desiredScopes.length;
    if (excessScopes > 0) {
      while (excessScopes--) { html = this.popScope(scopeStack, html); }
    }

    // pop until common prefix
    for (i = scopeStack.length, asc = scopeStack.length <= 0; asc ? i <= 0 : i >= 0; asc ? i++ : i--) {
      if (_.isEqual(scopeStack.slice(0, i), desiredScopes.slice(0, i))) { break; }
      html = this.popScope(scopeStack, html);
    }

    // push on top of common prefix until scopeStack is desiredScopes
    for (let j = i, end = desiredScopes.length, asc1 = i <= end; asc1 ? j < end : j > end; asc1 ? j++ : j--) {
      html = this.pushScope(scopeStack, desiredScopes[j], html, scopePrefix);
    }

    return html;
  },

  pushScope(scopeStack, scope, html, scopePrefix) {
    scopeStack.push(scope);
    const className = scopePrefix + scope.replace(/\.+/g, ` ${scopePrefix}`);
    return html += `<span class=\"${className}\">`;
  },

  popScope(scopeStack, html) {
    scopeStack.pop();
    return html += '</span>';
  }
};
