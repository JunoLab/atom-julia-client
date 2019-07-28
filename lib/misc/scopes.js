/** @babel */

import { Point, Range } from 'atom'

const juliaGrammar = atom.grammars.grammarForScopeName('source.julia')
const openers = [
  'if', 'while', 'for', 'begin', 'function', 'macro', 'module', 'baremodule', 'type', 'immutable',
  'struct', 'mutable struct', 'try', 'let', 'do', 'quote', 'abstract type', 'primitive type'
]
const reopeners = [ 'else', 'elseif', 'catch', 'finally' ]

function isKeywordScope (scopes) {
  // Skip 'source.julia'
  return scopes.slice(1).some(scope => {
    return scope.indexOf('keyword') > -1
  })
}

function isStringScope (scopes) {
  // Skip 'source.julia'
  return scopes.slice(1).some(scope => {
    return scope.indexOf('string') > -1
  })
}

function forRange (editor, range) {
  const scopes = []
  let n_parens = 0
  let n_brackets = 0
  const text = editor.getTextInBufferRange(range)
  juliaGrammar.tokenizeLines(text).forEach(lineTokens => {
    lineTokens.forEach(token => {
      const { value } = token
      if (!isStringScope(token.scopes)) {
        if (n_parens > 0 && value === ')') {
          n_parens -= 1
          scopes.splice(scopes.lastIndexOf('paren'), 1)
          return
        } else if (n_brackets > 0 && value === ']') {
          n_brackets -= 1
          scopes.splice(scopes.lastIndexOf('bracket'), 1)
          return
        } else if (value === '(') {
          n_parens += 1
          scopes.push('paren')
          return
        } else if (value === '[') {
          n_brackets += 1
          scopes.push('bracket')
          return
        }
      }
      if (!(isKeywordScope(token.scopes))) return
      if (!(n_parens === 0 && n_brackets === 0)) return

      const reopen = reopeners.includes(value)
      if (value === 'end' || reopen) scopes.pop()
      if (openers.includes(value) || reopen) scopes.push(value)
    })
  })
  return scopes
}

export function forLines (editor, start, end) {
  const startPoint = new Point(start, 0)
  const endPoint = new Point(end, Infinity)
  const range = new Range(startPoint, endPoint)
  return forRange(editor, range)
}

function isValidScopeToInspectHelper (scopes) {
  let isValid = true
  for (const scope of scopes) {
    if (scope.indexOf('comment') > -1) return false
    if (scope.indexOf('string') > -1) {
      isValid = false
      continue
    }
    if (scope.indexOf('interpolation') > -1) {
      isValid = true
      continue
    }
  }
  return isValid
}

/**
 * Returns `true` if the scope at `bufferPosition` in `editor` is valid code scope to be inspected
 */
export function isValidScopeToInspect (editor, bufferPosition) {
  const scopes = editor
    .scopeDescriptorForBufferPosition(bufferPosition)
    .getScopesArray()
  return isValidScopeToInspectHelper(scopes)
}
