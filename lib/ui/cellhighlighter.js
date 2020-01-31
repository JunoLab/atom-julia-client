'use babel'

import { getRange } from '../misc/cells'
import { CompositeDisposable, Range } from 'atom'

let subs
let edSubs

export function activate () {
    subs = new CompositeDisposable()
    edSubs = new CompositeDisposable()
    let marker
    let borders = []
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
                marker.destroy && marker.destroy()
                borders.forEach(m => m.destroy())
                edSubs.dispose()
            }))

            edSubs.add(ed.onDidChangeGrammar((grammar) => {
                marker.destroy && marker.destroy()
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

    let range = getRange(ed)

    range[1].row +=1
    range[1].column = 0

    if (marker && marker.destroy) {
        let mrange = marker.getBufferRange()
        if (mrange.start.row == range[0].row &&
            mrange.end.row == range[1].row) {
            return marker
        } else {
            marker.destroy()
        }
    }

    marker = ed.markBufferRange(range)
    let decoration = ed.decorateMarker(marker, {
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
        if (regex.test(buffer.lineForRow(i))) {
            const m = ed.markBufferRange([[i, 0], [i, Infinity]])
            let decoration = ed.decorateMarker(m, {
                type: 'line',
                class: 'julia-cell-border'
            })
            borders.push(m)
        }
    }

    return borders
}

export function deactivate () {
    subs && subs.dispose && subs.dispose()
    edSubs && edSubs.dispose && edSubs.dispose()
}
