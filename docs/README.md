# Contents

* Basics
  * [Developer Install](#developer-install) – get going with Atom and Julia package
    development.
* [Communication](communication.md) – Details how Atom and Julia both communicate with
  each other.

# Developer Install

Julia support in Atom consists of a number of packages for both Julia and Atom:

* [language-julia](https://github.com/JuliaLang/atom-language-julia) – Provides basic
  language support for Atom, e.g. syntax highlighting.
* [ink](https://github.com/JunoLab/atom-ink) – Provides generic UI components for building
  IDEs in Atom (e.g. the console lives here).
* [CodeTools.jl](http://github.com/JunoLab/CodeTools.jl) – provides backend editor support
  for Julia, e.g. autocompletion and evaluation.
* [Atom.jl](http://github.com/JunoLab/Atom.jl) and
  [julia-client](http://github.com/JunoLab/atom-julia-client) – these packages tie everything
  together. julia-client boots Julia from inside Atom, then communicates with the Atom.jl
  package to provide e.g. autocompletion and evaluation within the editor.

You can install *language-julia* by using Atom's `Install Packages And Themes` command and
searching for it. The Julia packages, *Atom.jl* and *CodeTools.jl*, can be installed via

```julia
Pkg.clone("git@github.com:JunoLab/Atom.jl")
Pkg.clone("git@github.com:JunoLab/CodeTools.jl")
```

To install the packages, run the following commands in a folder of your choice (it's
conventional, though not required, to do this in `~/github`):

```shell
git clone git@github.com:JunoLab/atom-ink ink
cd ink && apm install && apm link . && cd .. # install package dependencies
git clone git@github.com:JunoLab/atom-julia-client julia-client
cd julia-client && apm install && apm link . && cd .. # install package dependencies
```

It's a good idea to keep these up to date by running `Pkg.update()` in Julia and syncing the
package repos every now and then.

Atom will need to be reloaded, either by closing and reopening it or by running the `Window:
Reload` command. At this point, you should find that there are a bunch of new Julia commands
available in Atom – type "Julia" into the command palette to see what's available.

Get started by going into a buffer set to Julia syntax, typing `2+2`, and pressing
`C-Enter` (where `C` stands for `Ctrl`, or `Cmd` on OS X). After the client boots you
should see the result pop up next to the text. You can also work in the Atom REPL by pressing
`` Ctrl-` `` – just type in the input box and `Shift-Enter` to evaluate.

On OS X you may an error because the Julia command cannot be found, even though it's on your
path. To solve this you can either set the full path in the package settings, or start Atom
from the terminal with the `atom` command.
