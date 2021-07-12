/** @babel */

import { Point, Range, RangeCompatible, TextEditor, PointCompatible } from "atom"

const juliaScopes = ["source.julia", "source.embedded.julia"]
const openers = [
  "if",
  "while",
  "for",
  "begin",
  "function",
  "macro",
  "module",
  "baremodule",
  "type",
  "immutable",
  "struct",
  "mutable struct",
  "try",
  "let",
  "do",
  "quote",
  "abstract type",
  "primitive type"
]
const reopeners = ["else", "elseif", "catch", "finally"]

/**
 * 
 * @param {readonly string[]} scopes
 */
function isKeywordScope(scopes: readonly string[]) {
  // Skip 'source.julia'
  return scopes.slice(1).some(scope => {
    return scope.indexOf("keyword") > -1
  })
}

/**
 *
 * @param {readonly string[]} scopes
 */
export function isStringScope(scopes: readonly string[]) {
  let isString = false
  let isInterp = false
  for (const scope of scopes) {
    if (scope.indexOf("string") > -1) {
      isString = true
    }
    if (scope.indexOf("interpolation") > -1) {
      isInterp = true
    }
  }
  return isString && !isInterp
}

/**
 *
 * @param {TextEditor} editor
 * @param {RangeCompatible} range
 */
function forRange(editor: TextEditor, range: RangeCompatible) {
  // this should happen here and not a top-level so that we aren't relying on
  // Atom to load packages in a specific order:
  const juliaGrammar = atom.grammars.grammarForScopeName("source.julia")

  if (juliaGrammar === undefined) return []

  const scopes: string[] = []
  let n_parens = 0
  let n_brackets = 0
  const text = editor.getTextInBufferRange(range)
  juliaGrammar.tokenizeLines(text).forEach(lineTokens => {
    lineTokens.forEach(token => {
      const { value } = token
      if (!isStringScope(token.scopes)) {
        if (n_parens > 0 && value === ")") {
          n_parens -= 1
          scopes.splice(scopes.lastIndexOf("paren"), 1)
          return
        } else if (n_brackets > 0 && value === "]") {
          n_brackets -= 1
          scopes.splice(scopes.lastIndexOf("bracket"), 1)
          return
        } else if (value === "(") {
          n_parens += 1
          scopes.push("paren")
          return
        } else if (value === "[") {
          n_brackets += 1
          scopes.push("bracket")
          return
        }
      }
      if (!isKeywordScope(token.scopes)) return
      if (!(n_parens === 0 && n_brackets === 0)) return

      const reopen = reopeners.includes(value)
      if (value === "end" || reopen) scopes.pop()
      if (openers.includes(value) || reopen) scopes.push(value)
    })
  })
  return scopes
}

/**
 *
 * @param {TextEditor} editor
 * @param {number} start
 * @param {number} end
 */
export function forLines(editor: TextEditor, start: number, end: number) {
  const startPoint = new Point(start, 0)
  const endPoint = new Point(end, Infinity)
  const range = new Range(startPoint, endPoint)
  return forRange(editor, range)
}

/**
 *
 * @param {readonly string[]} scopes
 */
export function isCommentScope(scopes: readonly string[]) {
  // Skip 'source.julia'
  return scopes.slice(1).some(scope => {
    return scope.indexOf("comment") > -1
  })
}

/**
 * Returns `true` if the scope at `bufferPosition` in `editor` is valid code scope to be inspected.
 * Supposed to be used within Atom-IDE integrations, whose `grammarScopes` setting doesn't support
 * embedded scopes by default.
 *
 * @param {TextEditor} editor
 * @param {PointCompatible} bufferPosition
 */
export function isValidScopeToInspect(editor: TextEditor, bufferPosition: PointCompatible) {
  const scopes = editor.scopeDescriptorForBufferPosition(bufferPosition).getScopesArray()
  return scopes.some(scope => {
    return juliaScopes.includes(scope)
  })
    ? !isCommentScope(scopes) && !isStringScope(scopes)
    : false
}
