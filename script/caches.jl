newpath(path, pkgdir) = replace(path, r"^.*pkg", pkgdir)

fileentry(path) = (path, mtime(path))

function cache_header(io)
  n = position(io)
  seekstart(io)
  header = readbytes(io, n)
  return header
end

write(io, x) = Base.write(io, x)
write(io, x::Integer) = Base.write(io, hton(x))
write(io, x::Float64) = Base.write(io, hton(x))
write(io, s::ByteString) = (write(io, Int32(sizeof(s))); Base.write(io, s))
write(io, s::Symbol) = write(io, string(s))
write(io, xs...) = map(x->write(io, x), xs)

function writelength(f, io)
  loc = position(io)
  write(io, 0)
  start = position(io)
  f(io)
  stop = position(io)
  seek(io, loc)
  write(io, stop-start)
  seek(io, stop)
  return io
end

function process!(cache, pkgdir)
  open(cache) do io
    Base.isvalid_cache_header(io) || return
    header = cache_header(io)
    modules, files = Base.cache_dependencies(io)
    startswith(files[1][1], pkgdir) && return
    files = map(ft -> fileentry(newpath(ft[1], pkgdir)), files)
    open("$cache.1", "w") do out
      write(out, header)
      map(t->write(out, t...), modules)
      write(out, Int32(0))
      writelength(out) do out
        map(t->write(out, t...), files)
        write(out, Int32(0))
      end
      write(out, readbytes(io))
    end
  end
  if isfile("$cache.1")
    rm(cache)
    mv("$cache.1", cache)
  end
end

let
  pkgdir = joinpath(JULIA_HOME, "..", "pkg") |> normpath
  vers = "v$(VERSION.major).$(VERSION.minor)"

  cd(joinpath(pkgdir, "lib", vers)) do
    for cachefile in readdir()
      process!(cachefile, pkgdir)
    end
  end
end
