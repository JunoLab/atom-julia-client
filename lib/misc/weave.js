'use babel'

import 'atom';

export function getCode(){
  ed = atom.workspace.getActiveTextEditor();
  text = ed.getText();
  lines = text.split("\n");
  N = ed.getLineCount();
  var code = "";

  for (i=0; i<N; i++)
  {
     scopes = ed.scopeDescriptorForBufferPosition([i,0]).scopes;
     if (scopes.length > 1)
     {
         if (scopes[1] == "source.julia")
         {
             code += lines[i] + "\n";
         }
     }
  }
  return(code);
}
