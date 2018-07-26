let
if VERSION > v"0.7-"
  port = parse(Int, popfirst!(ARGS))
else
  port = parse(Int, shift!(ARGS))
end

junorc = abspath(homedir(), ".junorc.jl")

println("Starting Julia...")

try
  import Atom
  using Juno
  Atom.handle("junorc") do
    ispath(junorc) && include(junorc)
    nothing
  end
  Atom.connect(port)
catch
  rethrow()
end

end
