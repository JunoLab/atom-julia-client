'use babel'

export function defaultTerminal () {
  if (process.platform == 'win32') {
    return 'cmd /C start cmd /C'
  } else {
    return 'x-terminal-emulator -e'
  }
}

export function defaultShell () {
  const sh = process.env['SHELL']
  if (sh != undefined) {
    return sh
  } else if (process.platform == 'win32') {
    return 'powershell.exe'
  } else {
    return 'bash'
  }
}
