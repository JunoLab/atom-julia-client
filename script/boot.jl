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

pkgdir = joinpath(JULIA_HOME, "..", "pkg") |> normpath
vers = "v$(VERSION.major).$(VERSION.minor)"

if isdir(pkgdir)
  push!(LOAD_PATH, joinpath(pkgdir, vers))
end

precompile = !install && isempty(Base.find_all_in_cache_path(:Atom))

if precompile
  print(STDERR, "juno-msg-precompiling")
end

try
  if VERSION.minor >= 5
    @eval using Juno
  end
  import Atom
  cd(cwd)
  juliarc = joinpath(homedir(), ".juliarc.jl")
  isfile(juliarc) && include(juliarc)
  @sync Atom.serve(port, welcome = precompile || install)
catch
  print(STDERR, "juno-msg-load")
  rethrow()
end

end
