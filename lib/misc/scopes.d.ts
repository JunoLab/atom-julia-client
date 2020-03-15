import { PointCompatible, TextEditor } from "atom";
export declare function isStringScope(scopes: readonly string[]): boolean;
export declare function forLines(editor: TextEditor, start: number, end: number): string[];
export declare function isCommentScope(scopes: readonly string[]): boolean;
/**
 * Returns `true` if the scope at `bufferPosition` in `editor` is valid code scope to be inspected.
 * Supposed to be used within Atom-IDE integrations, whose `grammarScopes` setting doesn't support
 * embedded scopes by default.
 */
export declare function isValidScopeToInspect(editor: TextEditor, bufferPosition: PointCompatible): boolean;
