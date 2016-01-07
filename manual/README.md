# Julia Client Manual

This is the user manual for the atom-julia-client plugin and its dependencies. It's a little
sparse at the moment – reflecting the fact that the plugin isn't ready for all users – but
basic setup is included. If you'd like to get involved you can check out the [dev
setup](../docs) instead.

## Installation

In order to get Julia-Client working you need to install its dependencies in both Julia and
Atom. To start with, you'll need to work with Julia v0.4, if you're not already. You can
[build Julia from source](https://github.com/JuliaLang/julia) or [download the nightly
build](http://julialang.org/downloads/) – the download is easier to get started with,
particularly on Windows. From Julia, install the `Atom` package.

Next, go to the Atom settings pane and install the packages `language-julia`, `ink` and
`julia-client`. If you open the command palette and type `Julia` you should see that
Julia-related commands are now available. The last step is to make sure Atom can find Julia –
if the `julia` command is not on your path, you need to go into the julia-client settings
and set the path to the Julia binary, which is `[wherever you installed
Julia]/bin/julia` (or `[same]\bin\julia.exe` on Windows).

Finally, run the `Julia Client: Toggle Console` command from Atom. When the console opens,
type a Julia expression (e.g. `2+2`) and press `Enter` to evaluate it. This may take a while
the first time as precompilation runs, but booting Julia next time around will be much
quicker.

To get LaTeX-style tab completions, install the `latex-completions` package. 
This allows to write e.g. `\alpha<TAB>` and produce the Unicode `α`.
