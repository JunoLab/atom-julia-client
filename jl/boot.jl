let

port = parse(Int, shift!(ARGS))

pkgdir = joinpath(JULIA_HOME, "..", "pkg") |> normpath
vers = "v$(VERSION.major).$(VERSION.minor)"

if isdir(pkgdir)
  push!(LOAD_PATH, joinpath(pkgdir, vers))
  push!(Base.LOAD_CACHE_PATH, joinpath(pkgdir, "lib", vers))
end

using Atom
@sync Atom.connect(port)

end
