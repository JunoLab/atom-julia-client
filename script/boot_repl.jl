let
# NOTE: No single quotes. File needs to be shorter than 2000 chars.
if VERSION > v"0.7-"
  port = parse(Int, popfirst!(Base.ARGS))
else
  port = parse(Int, shift!(Base.ARGS))
end

junorc = haskey(ENV, "JUNORC_PATH") ? joinpath(ENV["JUNORC_PATH"], "juno_startup.jl") : joinpath(homedir(), ".julia", "config", "juno_startup.jl")
junorc = abspath(normpath(expanduser(junorc)))

if (VERSION > v"0.7-" ? Base.find_package("Atom") : Base.find_in_path("Atom")) == nothing
  p = VERSION > v"0.7-" ? x -> printstyled(x, color=:cyan, bold=true) : x -> print_with_color(:cyan, x, bold=true)
  p("\nHold on tight while we are installing some packages for you.\nThis should only take a few seconds...\n\n")

  if VERSION > v"0.7-"
    using Pkg
    Pkg.activate()
  end

  Pkg.add("Atom")
  Pkg.add("Juno")

  println()
end


# TODO: Update me when tagging a new relase:
MIN_ATOM_VER = v"0.12.11"
outdated = false

try
  if VERSION >= v"1.0-"
    using Pkg
    atompath = Base.find_package("Atom")

    if !occursin(Pkg.devdir(), atompath) # package is not `dev`ed
      tomlpath = joinpath(dirname(atompath), "..", "Project.toml")
      atomversion = VersionNumber(Pkg.TOML.parsefile(tomlpath)["version"])

      if atomversion < MIN_ATOM_VER
        outdated = """
          Please upgrade Atom.jl to at least version `$(MIN_ATOM_VER)` with e.g. `using Pkg; Pkg.update()`.

          If the integrated REPL is non-functional, try an external terminal opened with the `Julia Client: Open External REPL` command.
        """
      end
    end
  end
catch err
end

println("Starting Julia...")

try
  import Atom
  using Juno
  Atom.handle("junorc") do path
    cd(path)
    ispath(junorc) && include(junorc)

    if outdated != false
      Atom.msg("versionwarning", outdated)
    end
    nothing
  end
  Atom.connect(port)
catch
  if outdated != false
    printstyled("Outdated version of Atom.jl detected.\n", outdated, "\n", color = Base.error_color())
  end
  rethrow()
end
end
