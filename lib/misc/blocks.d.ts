import { TextEditor, Selection } from "atom";
interface LineInfo {
    scope: readonly string[];
    line: string;
}
export declare function getLine(editor: TextEditor, l: number): LineInfo;
export declare function moveNext(editor: TextEditor, selection: Selection, range: [[number, number], [number, number]]): void;
export declare function get(editor: TextEditor): {
    range: number[][] | undefined;
    selection: Selection;
    line: number;
    text: any;
}[];
export declare function getLocalContext(editor: TextEditor, row: number): {
    context: string;
    startRow: number;
};
export declare function select(editor?: TextEditor | undefined): void;
export {};
