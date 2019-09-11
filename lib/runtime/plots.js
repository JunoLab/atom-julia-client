'use babel'

import { client } from '../connection'
import { views } from '../ui'

const { webview } = views.tags

function consoleLog (e) {
  let log
  if (e.level === 0) {
    log = console.log
  } else if (e.level === 1) {
    log = console.warn
  } else if (e.level === 2) {
    log = console.error
  }
  log(e.message, `\nat ${e.sourceID}:${e.line}`)
}

export default {
  activate () {
    client.handle({
      plot: x => this.show(x),
      plotsize: () => this.plotSize(),
      ploturl: url => this.ploturl(url),
      jlpane: (id, opts) => this.jlpane(id, opts)
    })
    this.create()

    atom.config.observe('julia-client.uiOptions.usePlotPane', enabled => {
      if (enabled) {
        return this.pane.setTitle('Plots')
      } else {
        return this.pane.setTitle('Plots (disabled)')
      }
    })

    return atom.config.observe('julia-client.uiOptions.layouts.plotPane.defaultLocation', defaultLocation => {
      this.pane.setDefaultLocation(defaultLocation)
    })
  },

  create () {
    return this.pane = this.ink.PlotPane.fromId('default')
  },

  open () {
    return this.pane.open({
      split: atom.config.get('julia-client.uiOptions.layouts.plotPane.split')})
  },

  ensureVisible () {
    return this.pane.ensureVisible({ split: atom.config.get('julia-client.uiOptions.layouts.plotPane.split') })
  },

  close () {
    return this.pane.close()
  },

  show (view) {
    this.ensureVisible()
    const v = views.render(view)
    this.pane.show(new this.ink.Pannable(v))
    return v
  },

  plotSize () {
    return this.ensureVisible().then(() => {
      return this.pane.size().map(x => x*window.devicePixelRatio)
    })
  },

  webview (url) {
    const v = views.render(webview({
      class: 'blinkjl',
      src: url,
      style: 'width: 100% height: 100%'
    })
    )
    v.classList.add('native-key-bindings')
    v.addEventListener('console-message', e => consoleLog(e))
    return v
  },

  ploturl (url) {
    const v = this.webview(url)
    this.ensureVisible()
    return this.pane.show(v)
  },

  jlpane (id, opts) {
    if (opts == null) { opts = {} }
    let v = undefined
    if (opts.url) {
      v = this.webview(opts.url)
      if (opts.devtools) {
        v.addEventListener('dom-ready', () => {
          return v.openDevTools()
        })
      }
    }

    const pane = this.ink.HTMLPane.fromId(id)

    if (opts.close) {
      return pane.close()
    } else if (opts.destroy) {
      if (pane.closeAndDestroy) {
        return pane.closeAndDestroy()
      }
    } else {
      pane.show({
        item: v,
        icon: opts.icon,
        title: opts.title
      })

      return pane.ensureVisible({
        split: opts.split || atom.config.get('julia-client.uiOptions.layouts.plotPane.split')
      })
    }
  }
}
