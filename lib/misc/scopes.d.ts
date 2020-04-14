/** @babel */
import { TextEditor, PointCompatible } from "atom";
/**
 *
 * @param {readonly string[]} scopes
 */
export declare function isStringScope(scopes: readonly string[]): boolean;
/**
 *
 * @param {TextEditor} editor
 * @param {number} start
 * @param {number} end
 */
export declare function forLines(editor: TextEditor, start: number, end: number): string[];
/**
 *
 * @param {readonly string[]} scopes
 */
export declare function isCommentScope(scopes: readonly string[]): boolean;
/**
 * Returns `true` if the scope at `bufferPosition` in `editor` is valid code scope to be inspected.
 * Supposed to be used within Atom-IDE integrations, whose `grammarScopes` setting doesn't support
 * embedded scopes by default.
 *
 * @param {TextEditor} editor
 * @param {PointCompatible} bufferPosition
 */
export declare function isValidScopeToInspect(editor: TextEditor, bufferPosition: PointCompatible): boolean;
