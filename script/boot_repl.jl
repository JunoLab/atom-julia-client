let
port = parse(Int, shift!(ARGS))

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
  print(STDERR, "juno-msg-load")
  rethrow()
end

end
