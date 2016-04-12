let

if Base.find_in_path("Atom") == nothing
  println(STDERR, "Installing Atom.jl, hang tight...")
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
  push!(Base.LOAD_CACHE_PATH, joinpath(pkgdir, "lib", vers))
  include("caches.jl")
end

try
  using Atom
  @sync Atom.connect(port)
catch
  print(STDERR, "juno-err-load")
  rethrow()
end

end
