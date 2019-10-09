let
# NOTE: Single quotes in this file break remote execution. So dont use them.
if VERSION > v"0.7-"
  port = parse(Int, popfirst!(ARGS))
else
  port = parse(Int, shift!(ARGS))
end

junorc = haskey(ENV, "JUNORC_PATH") ?
           joinpath(ENV["JUNORC_PATH"], "juno_startup.jl") :
           joinpath(homedir(), ".julia", "config", "juno_startup.jl")
junorc = abspath(normpath(expanduser(junorc)))

if (VERSION > v"0.7-" ? Base.find_package("Atom") : Base.find_in_path("Atom")) == nothing
  p = VERSION > v"0.7-" ? (x) -> printstyled(x, color=:cyan, bold=true) : (x) -> print_with_color(:cyan, x, bold=true)
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
MIN_REQUIRED_ATOM_JL_VERSION = v"0.10.2"
atom_outdated = false

# check package versions:
try
  if VERSION >= v"1.0-"
    using Pkg
    atompath = Base.find_package("Atom")

    if !occursin(Pkg.devdir(), atompath) # package is not `dev`ed
      tomlpath = joinpath(dirname(atompath), "..", "Project.toml")
      atomversion = VersionNumber(Pkg.TOML.parsefile(tomlpath)["version"])

      if atomversion < MIN_REQUIRED_ATOM_JL_VERSION
        atom_outdated = """
          Please upgrade Atom.jl to at least version `$(MIN_REQUIRED_ATOM_JL_VERSION)` with e.g. `using Pkg; Pkg.update()`.

          If the integrated REPL is non-functional as a consequence of an old version of Atom.jl you will
          need to update in a terminal, which you can open with e.g. the `Julia Client: Open A Repl` command.
        """
      end
    end
  end
catch err
  @error exception=err
end

# load packages and connect to Atom:
println("Starting Julia...")

try
  import Atom
  using Juno
  Atom.handle("junorc") do path
    cd(path)
    ispath(junorc) && include(junorc)
    nothing
  end
  Atom.connect(port)
  if atom_outdated != false
    Atom.msg("versionwarning", atom_outdated)
  end
catch
  if atom_outdated != false
    printstyled("Outdated version of Atom.jl detected.\n", atom_outdated, "\n", color = Base.error_color())
  end
  rethrow()
end

end
