<!--
TODO: should we call "this project" Juno? I saw in communication.md we did,
but I'm not sure
 -->

# Workflow

One of the goals of this project is to help users adopt a more efficient
workflow when editing Julia code. To understand how to gain this productivity
boost, we will consider a common workflow for many Julia developers and a Juno
based workflow.

## Status quo

Suppose you are working on a file `foo.jl` that contains the definition of a
type `Bar`. As you are hacking away on the fields and functionality of the `Bar`
type you want to experiment with your work in the REPL. Here's what you might do:

- Edit `foo.jl`
- Fire up Julia and `include("foo.jl")` to load up your new types and methods
- Return to the editor to make more changes to `foo.jl`
- Go back to your REPL session and `include("foo.jl")` again, only to be greeted by the
  following error message:

```
julia> include("foo.jl")
ERROR: LoadError: invalid redefinition of constant Bar
 in include at ./boot.jl:260
 in include_from_node1 at ./loading.jl:271
while loading /Users/sglyon/Desktop/temp/julia/junk/foo.jl, in expression starting on line 3
```

At this point you have two options:

1. Quit Julia completely and start over. Then we will be able to
   `include("foo.jl")` one time before seeing that error message again.
2. Follow the [workflow tips](http://docs.julialang.org/en/latest/manual/workflow-tips/#repl-based-workflow)
   section of the manual and wrap the code in a module.

Option 1 is painful for obvious reasons: every time we make a change to anything
in `foo.jl` we have to restart Julia  and reload everything associated with our
code (including other packages we are `using`).

Option 2 seems better: it allows us to continue working with the same REPL
instance and reload code as we need to. However, it also comes with some costs:

- We now have to prefix all REPL access to anything in `foo.jl` with the name
  of our module: i.e. we use `ModuleName.Bar` instead of just `Bar`.
- Although we can re`include` our module, we will be having Julia reload the
  entire module, rather than just the parts that we have changed.

Wouldn't it be great if we had a solution that allowed:

- Reloading code at will
- Not prefixing everything with a module name
- Only reloading the code that actually changes
- Avoiding the need to switch back and forth from editor to REPL (a bonus :+1:)

## Enter Juno

Juno provides a way to do just that. I will first describe how the Juno workflow
looks and then explain a few of the details that make it possible:

- Start by putting the code from `foo.jl` in a module (as in option 2 above).
  Here we use the name `Tmp`.
- Launch a Julia client by executing the command `Julia client: Start Julia`
  (`cmd-j cmd-s` on OSX `ctrl-j ctrl-s` otherwise).
- Now, while editing `foo.jl` you should see `Main/Tmp` on the status
  bar as shown in the screenshot below:

![](static/main_modulename.png)

- If `foo.jl` is not on the Julia `LOAD_PATH` you should evaluate the
  whole file by executing the `Julia client: evaluate all` command
  (`cmd-shift-enter` or `ctrl-shift-enter`)
- Now open a different buffer in Julia mode (I create files named `scratch.jl`)
  and while this buffer is active run the `Julia Client: Set working module`
  command (`cmd-j cmd-m` or `ctrl-j ctrl-m`) and select the name of the module
  defined in `foo.jl`. After doing this you should see `Tmp` on the status
  bar where `Main/Tmp` was:

![](static/scratch_modulename.png)

- Now you are prepared to treat `scratch.jl` like the Julia REPL by writing code and evaluating it using `cmd-enter` (or `ctrl-enter` on Linux or Windows).
    - The key difference is that this "REPL" will have  _unqualifed_ access to
      all members of `Tmp`: i.e. you can use `Bar` instead of `ModuleName.Bar`
      as you had to in option 2 above.
    - What's more is that you can go back to `foo.jl`, edit and evaluate method
      definitions (again using `cmd-enter` or `ctrl-enter`) and the new methods
      are automatically ready to go when you return to working in `scratch.jl`

### How it works

So, how does this magic work? The secret sauce used here is clever use of an
optional argument to the `Base.eval` method. Let's look at the `?help` entry for
`Base.eval`:

```
help?> Base.eval
  eval([m::Module], expr::Expr)

  Evaluate an expression in the given module and return the result. Every Module (except those defined with baremodule) has its own 1-argument definition of eval, which evaluates expressions in that
  module.
```

Notice that if one argument is given, `Expr` is evaluated in the current working
module. However, if two arguments are given the first argument gives the name of
the module in which the `Expr` should be evaluated. So, when you run `Julia
Client: Set working module` what you are doing is telling Atom to evaluate all
the code from the current buffer directly into the chosen module. In our example
above, this means that all the code we evaluate from `scratch.jl` is evaluated
within the `Tmp` module _as if_ we had put the code in the module to begin with.

### Pro Tips

This workflow can take some getting used to, but can yield massive productivity
boosts once you master it. Here are some tips to help as you learn:

Don't ever set the current working module to the module defined in the buffer
you are working on.

- In the example above this means that if we wouldn't set the module to `Tmp`
  from within `foo.jl`.
- Doing so would show `Tmp/Tmp` in the status bar and would make it awkward
  to re-evaluate the entire buffer later on.
- If you do get in this situation, set the current working module to `Main` to
  restore `Main/Tmp` in the status bar


Use the  `Julia Client: Work in file Folder` or `Julia Client: Work in project
folder` commands to prevent issues when evaluating `include` statements with
relative paths.

- By default the atom Julia client starts at the root of your file system (`/`)
- Often you want the Julia client to work from the directory of the current
  buffer's file. I have the following in my `keymap.cson`:

```coffeescript
'atom-text-editor[data-grammar="source julia"]':
    'cmd-j cmd-f': 'julia-client:work-in-file-folder'
```

You can't change a type definition and re-evaluate with `cmd-enter` (or
`ctrl-enter`). Instead, whenever you modify a type definition you should
re-evaluate whole buffer using `cmd-shift-enter` (`ctrl-shift-enter`).

Using this workflow is especially helpful when working on `Base` Julia. As you
make changes to the files you don't need to re-build Julia to interact with
them. The same logic applies to other large modules and packages.
