# Contents

* Basics
  * [Developer Install](#developer-install) – get going with Atom and Julia package
    development.
* [Communication](communication.md) – Details how Atom and Julia both communicate with
  each other.

These docs are evolving as we figure out the best way to get people involved. If it's hard to get things working, or anything seems out of date, broken, or just plain confusing, please do let us know so we can fix it. Even better, file a PR!

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

You can install *language-julia* by using Atom's `Install Packages And Themes` command and searching for it. The Julia packages, *Atom.jl* and *CodeTools.jl*, can be installed via

```julia
Pkg.clone("http://github.com/JunoLab/Atom.jl")
Pkg.clone("http://github.com/JunoLab/CodeTools.jl")
```

If you already have these packages change `clone` to `checkout` here.

To install the latest atom packages, run the commands:

```shell
apm install https://github.com/JunoLab/atom-ink
apm install https://github.com/JunoLab/atom-julia-client
```

It's a good idea to keep these up to date by running `Pkg.update()` in Julia and syncing the package repos every now and then, which will be in `~/.atom/packages/julia-client` and `~/.atom/packages/ink`.

Atom will need to be reloaded, either by closing and reopening it or by running the `Window: Reload` command. At this point, you should find that there are a bunch of new Julia commands available in Atom – type "Julia" into the command palette to see what's available. If the `julia` command isn't on your path already, set the Julia path in the julia-client settings panel.

Get started by going into a buffer set to Julia syntax, typing `2+2`, and pressing <kbd>C-Enter</kbd> (where <kbd>C</kbd> stands for <kbd>Ctrl</kbd>, or <kdb>Cmd</kbd> on OS X). After the client boots you should see the result pop up next to the text. You can also work in the Atom REPL by pressing <kbd>C-J C-O</kbd> – just type in the input box and <kbd>Shift-Enter</kbd> to evaluate.
