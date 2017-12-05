'use babel'

import { client } from '../connection'
import tcp from '../connection/process/tcp'
import { CompositeDisposable } from 'atom'
import { paths } from '../misc'
import modules from './modules'
import pty from 'pty.js'
import { debounce } from 'underscore-plus'

var {changemodule} = client.import({msg: ['changemodule']})

export function activate (ink) {
  let subs = new CompositeDisposable()

  let terminal = ink.InkTerminal.fromId('julia-terminal')
  console.log(terminal);
  tcp.listen().then((port) => {
    let ty = pty.fork(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
      cols: 100,
      rows: 30
    })

    terminal.attach(ty)
    terminal.execute(`"${paths.jlpath()}" -i -e "using Juno; Juno.connect(${port})"`)
  })

  // powershell: `Start-process "${paths.jlpath()}" -NoNewWindow -wait -ArgumentList "-i -e \`"using Juno; Juno.connect(${port})\`""`
  // tcp.listen().then((port) => terminal.execute(`"${}" -i -e "using Juno; Juno.connect(${port})"`))
  terminal.getTitle = () => {return 'Console'}
  modules.onDidChange(debounce(() => changemodule({mod: modules.current(), cols: terminal.terminal.cols}), 200))

  client.handle({updateWorkspace: () => require('./workspace').update()})

  subs.add(atom.commands.add('atom-workspace', 'julia-client:julia-terminal', () => {
    terminal.open().then(() => terminal.show())
  }))

  subs.add(atom.commands.add('atom-workspace', 'julia-client:new-terminal', () => {
    let term = ink.InkTerminal.fromId(`terminal${Math.floor(Math.random()*10000000)}`)
    term.spawn()
    term.open().then(() => term.show())
  }))
}

export function deactivate () {
  subs.dispose()
}
