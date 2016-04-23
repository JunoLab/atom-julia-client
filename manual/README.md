# Juno Manual

This is the user manual for Juno. It's a little sparse at the moment – reflecting the fact that the plugin isn't ready for all users – but basic setup is included. If you'd like to get involved you can check out the [dev setup](../docs) instead.

* Installation Instructions – this page
* [Workflow](workflow.md) – tips and tricks on using Juno/Julia productively

## Manual Install

You don't need to do this if you already downloaded a Juno bundle. You'll need these instructions if a bundle is not available for your platform above, or if you want to use the same copy of Atom for both Julia and non-Julia work.

First, [download and install Julia](http://julialang.org/downloads) if you haven't already – v0.4 or above is required.

Next, install [Atom](https://atom.io) if you don't have it already, then go to the settings pane and install the packages `language-julia`, `ink` and
`julia-client`. You can also run `apm install ink` etc from your terminal, which may be quicker. If you open the command palette and type `Julia` you should see that
Julia-related commands are now available.

The last step is to connect Atom and Julia together –
if the `julia` command is not on your path, you need to go into the julia-client settings
and set the path to the Julia binary, which is `[wherever you installed
Julia]/bin/julia` (or `[same]\bin\julia.exe` on Windows). If you downloaded the OS X app and put it in `/Applications`, then the path will look like `/Applications/Julia-0.X.Y.app/Contents/Resources/julia/bin/julia` – just modify that for your Julia version.

Finally, run the `Julia Client: Open Console` command from Atom. When the console opens,
type a Julia expression (e.g. `2+2`) and press <kbd>Enter</kbd> to evaluate it.

To get LaTeX-style tab completions, install the `latex-completions` package.
For example, writing `\alpha<TAB>` will produce the Unicode `α`.
