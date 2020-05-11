import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import peerexternal from 'rollup-plugin-peer-deps-external';

import babel from 'rollup-plugin-babel';
// import typescript from '@rollup/plugin-typescript';
import coffeescript from 'rollup-plugin-coffee-script';
import json from '@rollup/plugin-json';

import { terser } from 'rollup-plugin-terser';

// import pkg from './package.json';

let plugins = [

  // Convert CoffeeScript to JavaScript
  coffeescript(),

  babel(),

  json(),

  // // datatip loads faster without this
  peerexternal({
    includeDependencies: true,
  }),

  // so Rollup can find externals
  resolve({ extensions: ['.js', '.coffee'], preferBuiltins: true }),

  // so Rollup can convert externals to an ES module
  commonjs({
    extensions: ['.js', '.coffee'],
    // undetected named exports
    namedExports: {
      // left-hand side can be an absolute path, a path relative to the current directory, or the name of a module in node_modules
      'underscore-plus': ['debounce', 'throttle'],
    },
  }),


  // // Convert TypeScript to JavaScript
  // typescript(
  //   { noEmitOnError: false }
  // ),
];

// minify only in production mode
if (process.env.NODE_ENV === 'production') {
  plugins.push(
    // minify
    terser({
      ecma: 2018,
      warnings: true,
      compress: {
        drop_console: true,
      },
    })
  );
}

export default [
  {
    input: 'lib/julia-client.coffee',
    output: [
      {
        dir: "dist",
        format: 'cjs',
        sourcemap: true,
      },
    ],
    // loaded externally
    external: [
      'electron',
      'atom',
      'fs',
      'path',
      // 'ssh2',
      // 'atom-package-deps',
      // 'node-pty-prebuilt-multiarch'
    ],
    plugins: plugins,
  },
];
