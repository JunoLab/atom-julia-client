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
cwd = shift!(ARGS)

precompile = !install && isempty(Base.find_all_in_cache_path(:Atom))

if precompile
  print(STDERR, "juno-msg-precompiling")
end

cd(cwd) # windows might no have this set correctly

try
  junorc = joinpath(homedir(), ".junorc.jl")
  isfile(junorc) && include(junorc)
catch
  print(STDERR, "juno-msg-junorc")
  rethrow()
end

try
  import Atom
  @eval using $(VERSION < v"0.5-" ? :Atom : :Juno)
  @sync Atom.serve(port, welcome = precompile || install)
catch
  print(STDERR, "juno-msg-load")
  rethrow()
end

end
