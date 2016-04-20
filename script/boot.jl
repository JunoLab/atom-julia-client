let

install = Base.find_in_path("Atom") == nothing

if install
  print(STDERR, "juno-err-installing")
  try
    Pkg.add("Atom")
  catch
    print(STDERR, "juno-err-install")
    rethrow()
  end
end

port = parse(Int, shift!(ARGS))

pkgdir = joinpath(JULIA_HOME, "..", "pkg") |> normpath
vers = "v$(VERSION.major).$(VERSION.minor)"

if isdir(pkgdir)
  push!(LOAD_PATH, joinpath(pkgdir, vers))
end

precompile = !install && isempty(Base.find_all_in_cache_path(:Atom))

if precompile
  print(STDERR, "juno-err-precompiling")
end

try
  using Atom
  @sync Atom.connect(port, welcome = precompile || install)
catch
  print(STDERR, "juno-err-load")
  rethrow()
end

end
