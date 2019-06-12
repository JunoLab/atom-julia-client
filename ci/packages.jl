jlpath = readchomp(`which julia`)

mkpath("../julia")
run(`ln -s $jlpath ../julia/julia`)

using Pkg
pkg"add Juno Atom"

if get(ENV, "ATOMJL", "") == "master"
  pkg"add Atom#master"
end

using Juno
import Atom
