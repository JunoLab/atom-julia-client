## 0.6.0
* PlatformIO terminal integration
* Results can be displayed in the Console instead of inline ([#332](https://github.com/JunoLab/atom-julia-client/pull/332))
* add support for `.junorc.jl`
* add support for `Juno.notify()` API
* julia path setting will now resolve `~` properly
* added in-editor profile viewer ([#349](https://github.com/JunoLab/atom-julia-client/pull/349))
* overhaul of inline result display ([#127](https://github.com/JunoLab/atom-ink/pull/127))

## 0.5.12
* Graphical breakpoints

## 0.5.11
* Connect Juno to Jupyter or a terminal repl
* Cell-block eval mode
* Inline results can be displayed in block-mode
* Much more powerful `@progress` with support for nested loops and concurrency

## 0.5.0
* Inline Documentation
* Debugger
* Workspace view
* Autocomplete in the console
* More helpful error messages when boot fails
* `@progress` macro to show progress in the status bar
* External packages can interact with the Julia client, including to provide custom boot mechanisms (e.g. over SSH)
* Julia boot is now near-instant in many cases
* Stack traces no longer show Atom.jl-internal code

## 0.4.0
* Better Console buffering
* History prefix support, like the repl
* The console can work in any module
* Plotting pane
* Julia menu and toolbar

## 0.3.0
* New Packages->Julia menu
* Option to launch Julia on startup
* Windows firewall no longer complains on first run
* Console UI improvements
* Improvments to copyability everywhere
* Graphics support
* REPL history integration

## 0.2.0
* Improved scrolling for inline results
* Inter-file links in errors and `methods` output
* Interrupts also working on Windows
* On-a-keystroke access to inline documentation and methods
* Inline results are copyable

## 0.1.0 - First Release
* Every feature added
* Every bug fixed
