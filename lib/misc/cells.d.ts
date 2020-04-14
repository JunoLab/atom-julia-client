import { Point, TextEditor } from "atom";
/**
 * @param {TextEditor} editor
 * @returns {[Point, Point]}
 */
export declare function getRange(editor: TextEditor): [Point, Point];
/**
 * @param {TextEditor} editor
 */
export declare function get(editor: TextEditor): {
    range: any[][];
    selection: any;
    line: any;
    text: any;
}[];
/**
 * @param {TextEditor | null | undefined} editor
 */
export declare function moveNext(editor: TextEditor | null | undefined): void | null;
/**
 * @param {TextEditor | undefined | null} editor
 */
export declare function movePrev(editor: TextEditor | undefined | null): void | null;
