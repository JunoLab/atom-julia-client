let

pkgdir = joinpath(JULIA_HOME, "..", "pkg") |> normpath
vers = "v$(VERSION.major).$(VERSION.minor)"
dummy = "i sure hope this isn't in any packages"

newpath(path) = replace(path, r"^.*pkg", pkgdir)

fileentry(path) = (path, mtime(path))

@unix_only filepad(s::ASCIIString, n) = lpad(s, n, "/")
@windows_only filepad(s::ASCIIString, n) = replace(s, r"\\", "\\"^(n-length(s)+1), 1)
filepad(s::UTF8String, n) = filepad(ASCIIString(s), n)

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

function startswith!(io::IO, s::ASCIIString)
  pos = position(io)
  for c in s
    if eof(io) || c ≠ read(io, UInt8)
      seek(io, pos)
      return false
    end
  end
  return true
end

function process!(cache)
  f = open(cache)
  Base.isvalid_cache_header(f) || return
  header = cache_header(f)
  modules, files = Base.cache_dependencies(f)
  startswith(files[1][1], pkgdir) && return
  files = map(ft -> fileentry(newpath(ft[1])), files)

  io = IOBuffer(readbytes(f))
  out = IOBuffer()
  close(f)
  # Header
  write(out, header)
  map(t->write(out, t...), modules)
  write(out, Int32(0))
  writelength(out) do out
    map(t->write(out, t...), files)
    write(out, Int32(0))
  end
  # Body
  while !eof(io)
    pos = position(io)
    if startswith!(io, dummy)
      while Base.peek(io) == ' '
        read(io, Char)
      end
      path = joinpath(pkgdir, vers)
      len = position(io)-pos
      length(path) > len && error("Internal error: $path is longer than $len")
      write(out, filepad(path, len).data)
    end
    write(out, read(io, UInt8))
  end
  open(io -> write(io, takebuf_array(out)), "$cache", "w")
end

try
  cd(joinpath(pkgdir, "lib", vers)) do
    for cachefile in readdir()
      endswith(cachefile, ".ji") || continue
      process!(cachefile)
    end
  end
catch e
  println(STDERR, "Error processing bundle packages:")
  showerror(STDERR, e, catch_backtrace())
end

end
