# Communication

Juno works by booting a Julia client from Atom. When Julia starts it connects to Atom over a
TCP port, and from that point on Julia and Atom can each send messages to
each other. Messages are JSON objects, with a type header to tell the receiver how the
message should be handled.

The code handling low-level communication is kept in
[client.coffee](https://github.com/JunoLab/atom-julia-client/blob/master/lib/connection/client.coffee)
and [comm.jl](https://github.com/JunoLab/Atom.jl/blob/master/src/comm.jl). However, the
details of those files aren't particularly important – you only need to understand the
communication API, which we'll go over here.

## Sending messages from Atom

Communication works by sending messages with an appropriate type on one side and registering
handlers for that type on the other. The handler then takes some action and returns data to
the original sender. For example, on the Atom side messages are sent in CoffeeScript as
follows:

```coffeescript
client.msg 'eval', '2+2'
```

On the Julia side, we need to set up a handler for this message, which happens as follows:

```julia
handle("eval") do code
  eval(parse(code))
end
```

This is a very simplified version of the `eval` handler that you can find in the Atom.jl
source code. It simply evaluates whatever it's given and returns the result – in this case,
`4`.

Often we want to do something with that return result in Atom – in this case, we'd like to
display the result. We don't need to change anything on the Julia side to accomplish this;
we can just use the `rpc` function from JS:

```coffeescript
client.rpc('eval', '2+2').then (result) =>
  console.log data
```

This call sends the `eval` message, pulls the `result` field out of the returned JSON, and
displays the result, `4`, in the console.

This approach is exactly how Atom gets evaluation results, autocompletion and more from
Julia – so it's easy to find more examples spread throughout the
[julia-client](https://github.com/JunoLab/atom-julia-client/tree/master/lib) and
[Atom.jl](https://github.com/JunoLab/Atom.jl/tree/master/src) source code.

As a first project, try implementing an Atom command (see the Atom docs) which sends this
message to Julia, as well as adding the Julia handler above to Atom.jl. (You'll want to use
a type other than `eval` to avoid clashes with actual evaluation.)

## Sending messages from Julia

Julia has a similar mechanism to talk to Atom via the function

```julia
Atom.@msg type(args...)
```

Handlers are defined on the Atom side as follows:

```coffeescript
client.handle 'log', (args...) ->
  console.log args
```

It's also possible for Julia to wait for a response from Atom, using the `rpc` function.

```coffeescript
client.handle 'echo', (data) ->
  data
```

(It's very easy to add this code to `julia-client`'s [`activate`
function](https://github.com/JunoLab/atom-julia-client/blob/master/lib/julia-client.coffee)
if you want to try this out.)

Calling the following from the REPL:

```julia
Atom.@rpc echo(Dict(:a=>1, :b=>2))
```

will return `Dict("a"=>1, "b"=>2)`. The data was passed to Atom and simply returned as-is.
Try changing the handler to modify the data before returning it.

This mechanism is how Julia commands like `Atom.select()` are implemented, and in general it
makes it very simple for Julia to control the Atom frontend – see
[frontend.jl](https://github.com/JunoLab/Atom.jl/blob/master/src/frontend.jl) and
[frontend.coffee](https://github.com/JunoLab/atom-julia-client/blob/master/lib/frontend.coffee)

## Debugging and Learning

A good way to get a handle on this stuff is just to use `console.log` and `@show`, on the
Atom and Julia sides respectively, to take a peek at what's going over the wire. For example,
it's easy to change the above Julia handler to

```julia
handle("eval") do data
  @show data
  @show Dict(:result => eval(parse(data["code"])))
end
```

This will show you both the data being sent to Julia (in the example above,
`Dict("code"=>"2+2")`) and the data being sent back to Atom (`Dict(:result => 4)`).
Modifying say, the completions handler in a similar way will show you what completion data
Julia sends back to Atom (there will probably be a lot, so try looking at specific
keys, for example).

You don't need to reload Atom or restart the Julia client every time you make a change like
this. If you open a file from the `Atom.jl` source code, you should see from the status bar
that Juno knows you're working with the `Atom` module (try evaluating `current_module()` if
you're not sure). Evaluating `handlers` from within the `Atom` module will show you what
message types are currently defined. If you change a handler, just press `C-Enter` to update
it in place; you should see the effect of your update immediately next time the handler is
triggered. For example, if you modify the
[`eval`](https://github.com/JunoLab/Atom.jl/blob/master/src/eval.jl) handler as follows:

```julia
handle("eval") do data
  println(data["code"]) # <- insert this line
  # ...
```

and update it, you should find that the *next* time you evaluate you see the contents of the
current editor dumped into the console. Thus, most features or fixes you'd want to add to
Juno can be made without a long edit – compile – run cycle.
