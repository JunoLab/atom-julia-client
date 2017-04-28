jlpath = readchomp(`which julia`)

mkpath("../julia")
run(`ln -s $jlpath ../julia/julia`)

Pkg.add("Atom")

if get(ENV, "ATOMJL", "") == "master"
  Pkg.checkout("Atom")
end

using Atom
