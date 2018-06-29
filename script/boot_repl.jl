let
port = parse(Int, popfirst!(ARGS))

junorc = abspath(homedir(), ".junorc.jl")

println("Starting Julia...")

try
  import Atom
  using Juno
  Atom.handle("connected") do
    ispath(junorc) && include(junorc)
    nothing
  end
  Atom.connect(port)
catch
  rethrow()
end

end
