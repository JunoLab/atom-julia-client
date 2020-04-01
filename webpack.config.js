"use strict"

const EntryFile = "./lib/julia-client.coffee"
const OutDirectory = "dist"
const JSOutFile = "indent-detective.js"

const CoffeeLoaderOptions = {
  transpile: {
     presets: ["@babel/env"]
   }
}

// const TsLoaderOptions = {
//     transpileOnly: true, // transpileOnly to ignore typescript errors,
//     compiler: "ttypescript" // set to ttypescript use transform-for-of. Default is "typescript"
// }

/********************************************************************************/

const path = require("path")

/**@type {import('webpack').Configuration}*/
const config = {
  target: "node", // Atom packages run in a Node.js-context, https://webpack.js.org/configuration/node/

  entry: EntryFile, // the entry point of this package, https://webpack.js.org/configuration/entry-context/

  output: {
    // the bundle is stored in the 'lib' folder (check package.json), https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, OutDirectory),
    filename: JSOutFile,
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]"
  },
  devtool: "source-map",
  externals: {
    // https://webpack.js.org/configuration/externals/
    atom: "atom",
    electron: "electron"
  },
  resolve: {
    // support reading Cofeescript and JavaScript files, https://github.com/TypeStrong/ts-loader
    extensions: [".js", "coffee"] // ".ts"
  },
  module: {
    rules: [
      {
        // all source files with a `.coffee` extension will be handled by `coffee-loader`
        test: /\.coffee$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "coffee-loader",
            options: CoffeeLoaderOptions
          }
        ]
      }
      // {
      //     // all source files with a `.ts` extension will be handled by `ts-loader`
      //     test: /\.ts$/,
      //     exclude: /node_modules/,
      //     use: [
      //         // ts
      //         {
      //             loader: "ts-loader",
      //             options: TsLoaderOptions
      //         }
      //     ]
      // }
    ]
  }
}
module.exports = config
