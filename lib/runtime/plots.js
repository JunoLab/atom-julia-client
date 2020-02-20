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

// https://stackoverflow.com/a/5100158/12113178
function dataURItoBlob (dataURI) {
  // convert base64/URLEncoded data component to raw binary data held in a string
  let byteString
  if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1])
  else
      byteString = unescape(dataURI.split(',')[1])

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  var ia = new Uint8Array(byteString.length)
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ia], {type:mimeString})
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
    this.pane.show(new this.ink.Pannable(v), {
      maxSize: atom.config.get('julia-client.uiOptions.maxNumberPlots')
    })
    return v
  },

  plotSize () {
    return this.ensureVisible().then(() => {
      return {
        size: this.pane.size(),
        ratio: window.devicePixelRatio
      }
    })
  },

  webview (url) {
    const isDataURI = url.startsWith('data')
    if (isDataURI) {
      const object = dataURItoBlob(url)
      url = URL.createObjectURL(object)
    }

    const v = views.render(webview({
      class: 'blinkjl',
      src: url,
      style: 'width: 100%; height: 100%'
    }))
    v.classList.add('native-key-bindings')
    v.addEventListener('console-message', e => consoleLog(e))
    if (isDataURI) {
      v.addEventListener('dom-ready', e => {
        URL.revokeObjectURL(url)
      })
    }
    return v
  },

  ploturl (url) {
    const v = this.webview(url)
    this.ensureVisible()
    return this.pane.show(v, {
      maxSize: atom.config.get('julia-client.uiOptions.maxNumberPlots')
    })
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
