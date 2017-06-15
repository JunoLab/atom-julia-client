'use babel'

import 'atom'

export function getCode (ed) {
  const text = ed.getText()
  const lines = text.split("\n")
  const N = ed.getLineCount()
  let code = ""

  for (let i = 0; i < N; i++) {
     let scopes = ed.scopeDescriptorForBufferPosition([i, 0]).scopes
     if (scopes.length > 1) {
         if (scopes.indexOf("source.embedded.julia") > -1) {
             code += lines[i] + "\n"
         }
     }
  }
  return code
}
