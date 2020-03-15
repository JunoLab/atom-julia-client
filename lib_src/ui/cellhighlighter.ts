'use babel'

import { getRange } from '../misc/cells'
import { CompositeDisposable } from 'atom'
import { getLine } from '../misc/blocks.js'

let subs
let edSubs
let marker
let borders = []

export function activate () {
    subs = new CompositeDisposable()
    edSubs = new CompositeDisposable()

    subs.add(atom.workspace.observeActiveTextEditor(ed => {
        if (ed && ed.getGrammar && ed.getGrammar().id === 'source.julia') {
            if (edSubs && edSubs.dispose) {
                edSubs.dispose()
                edSubs = new CompositeDisposable()
            }
            borders = highlightCellBorders(ed, borders)

            marker = highlightCurrentCell(ed, marker, borders)

            edSubs.add(ed.onDidChangeCursorPosition(ev => {
                marker = highlightCurrentCell(ed, marker, borders)
            }))

            edSubs.add(ed.onDidStopChanging(() => {
                borders = highlightCellBorders(ed, borders)
                marker = highlightCurrentCell(ed, marker, borders)
            }))

            edSubs.add(ed.onDidDestroy(() => {
                marker && marker.destroy && marker.destroy()
                borders.forEach(m => m.destroy())
                edSubs.dispose()
            }))

            edSubs.add(ed.onDidChangeGrammar((grammar) => {
                marker && marker.destroy && marker.destroy()
                borders.forEach(m => m.destroy())

                if (ed.getGrammar().id == 'source.julia') {
                    borders = highlightCellBorders(ed, borders)
                    marker = highlightCurrentCell(ed, marker, borders)
                }
            }))
        }
    }))
}

function highlightCurrentCell (ed, marker, borders) {
    if (borders.length === 0) {
        marker && marker.destroy && marker.destroy()
        return null
    }

    const range = getRange(ed)

    range[1].row +=1
    range[1].column = 0

    if (marker && marker.destroy) {
        const mrange = marker.getBufferRange()
        if (mrange.start.row == range[0].row &&
            mrange.end.row == range[1].row) {
            return marker
        } else {
            marker.destroy()
        }
    }

    marker = ed.markBufferRange(range)
    ed.decorateMarker(marker, {
        type: 'line-number',
        class: 'julia-current-cell'
    })
    ed.decorateMarker(marker, {
        type: 'line',
        class: 'julia-current-cell'
    })

    return marker
}

function highlightCellBorders (ed, borders) {
    borders.forEach(m => m.destroy())

    const regexString = '^(' + atom.config.get('julia-client.uiOptions.cellDelimiter').join('|') + ')'
    const regex = new RegExp(regexString)

    const buffer = ed.getBuffer()

    borders = []

    for (let i = 0; i <= buffer.getEndPosition().row; i++) {
        const { line, scope } = getLine(ed, i)
        if (regex.test(line) && scope.join('.').indexOf('comment.line') > -1) {
            const m = ed.markBufferRange([[i, 0], [i, Infinity]])
            ed.decorateMarker(m, {
                type: 'line',
                class: 'julia-cell-border'
            })
            borders.push(m)
        }
    }

    return borders
}

function destroyMarkers () {
    marker && marker.destroy && marker.destroy()
    borders.forEach(m => m.destroy())
    marker = null
    borders = []
}

export function deactivate () {
    destroyMarkers()
    subs && subs.dispose && subs.dispose()
    edSubs && edSubs.dispose && edSubs.dispose()
}
