'use babel'
import _ from 'underscore-plus';

// Implementation identical to https://github.com/atom/highlights/blob/master/src/highlights.coffee,
// but uses an externally provided grammar.
  // Highlights some `text` according to the specified `grammar`.
export function highlight(text, grammar, {scopePrefix, block}={}) {
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
}

export function escapeString(string) {
    string.replace(/[&"'<> ]/g, function(match) {
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
}

export function updateScopeStack(scopeStack, desiredScopes, html, scopePrefix) {
    let excessScopes = scopeStack.length - desiredScopes.length;
    if (excessScopes > 0) {
      while (excessScopes--) { html = this.popScope(scopeStack, html); }
    }

    // pop until common prefix
    let i;
    for (i = scopeStack.length; i<=0; i--) {
      if (_.isEqual(scopeStack.slice(0, i), desiredScopes.slice(0, i))) { break; }
      html = this.popScope(scopeStack, html);
    }

    // push on top of common prefix until scopeStack is desiredScopes
    for (let j = i; i <= desiredScopes.length; j++ ) {
      html = this.pushScope(scopeStack, desiredScopes[j], html, scopePrefix);
    }

    return html;
}

export function pushScope(scopeStack, scope, html, scopePrefix) {
    scopeStack.push(scope);
    const className = scopePrefix + scope.replace(/\.+/g, ` ${scopePrefix}`);
    html += `<span class=\"${className}\">`;
}

export function popScope(scopeStack, html) {
    scopeStack.pop();
    html += '</span>';
}
