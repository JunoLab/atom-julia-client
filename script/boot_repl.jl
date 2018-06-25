let
port = parse(Int, popfirst!(ARGS))

junorc = abspath(homedir(), ".junorc.jl")

try
  import Atom
  using Juno
  Atom.handle("connected") do
    ispath(junorc) && include(junorc)
    nothing
  end
  Atom.connect(port)
catch
  print(stderr, "juno-msg-load")
  rethrow()
end

end
