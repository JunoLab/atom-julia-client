import { Point, TextEditor } from "atom";
export declare function getRange(editor: TextEditor): [Point, Point];
export declare function get(editor: TextEditor): {
    range: any[][];
    selection: any;
    line: any;
    text: any;
}[];
export declare function moveNext(editor: TextEditor | null | undefined): void | null;
export declare function movePrev(editor: TextEditor | undefined | null): void | null;
