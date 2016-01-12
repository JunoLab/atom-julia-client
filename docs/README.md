# Contents

* Basics
  * [Developer Install](#developer-install) – get going with Atom and Julia package
    development.
* [Communication](communication.md) – Details how Atom and Julia both communicate with
  each other.

These docs are evolving as we figure out the best way to get people involved. If it's hard
to get things working, or anything seems out of date, broken, or just plain confusing,
please do let us know so we can fix it. Even better, file a PR!

# Developer Install

Firstly, you need to be working in Julia v0.4 for Atom. Currently, you can either build Julia
from source or download a [nightly build](http://julialang.org/downloads/).

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
Pkg.clone("http://github.com/JunoLab/Atom.jl")
Pkg.clone("http://github.com/JunoLab/CodeTools.jl")
```

If you already have these packages change `clone` to `checkout` here.

To install the Atom packages, start by uninstalling them completely if you have them
already, then run the following commands in a folder of your choice (it's conventional,
though not required, to do this in `~/github`):

```shell
git clone http://github.com/JunoLab/atom-ink ink
cd ink
apm install
apm link .
cd ..

git clone http://github.com/JunoLab/atom-julia-client julia-client
cd julia-client
apm install
apm link .
cd ..
```

It's a good idea to keep these up to date by running `Pkg.update()` in Julia and syncing the
package repos every now and then.

Atom will need to be reloaded, either by closing and reopening it or by running the `Window:
Reload` command. At this point, you should find that there are a bunch of new Julia commands
available in Atom – type "Julia" into the command palette to see what's available. If the
`julia` command isn't on your path already, set the Julia path in the julia-client settings
panel.

Get started by going into a buffer set to Julia syntax, typing `2+2`, and pressing
`C-Enter` (where `C` stands for `Ctrl`, or `Cmd` on OS X). After the client boots you
should see the result pop up next to the text. You can also work in the Atom REPL by pressing
`` Ctrl-` `` – just type in the input box and `Shift-Enter` to evaluate.

On OS X you may see an error because the Julia command cannot be found, even though it's on your
path. To solve this you can either set the full path in the package settings, or start Atom
from the terminal with the `atom` command.
