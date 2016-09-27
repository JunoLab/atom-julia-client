let

install = Base.find_in_path("Atom") == nothing

if install
  print(STDERR, "juno-msg-installing")
  try
    Pkg.add("Atom")
  catch
    print(STDERR, "juno-msg-install")
    rethrow()
  end
end

port = parse(Int, shift!(ARGS))

precompile = !install && isempty(Base.find_all_in_cache_path(:Atom))

if precompile
  print(STDERR, "juno-msg-precompiling")
end

try
  import Atom
  @eval using $(VERSION < v"0.5-" ? :Atom : :Juno)
  @sync Atom.connect(port, welcome = precompile || install)
catch
  print(STDERR, "juno-msg-load")
  rethrow()
end

end
