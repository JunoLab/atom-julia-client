let presets = ["@babel/preset-react", "@babel/preset-env"];

let plugins =  [
  "@babel/plugin-syntax-dynamic-import",
  '@babel/plugin-proposal-class-properties'
  // "transform-react-remove-prop-types",
  // '@babel/plugin-proposal-optional-chaining',
];

if (process.env.BABEL_ENV === "development") {
  plugins.push("@babel/plugin-transform-modules-commonjs")
}

module.exports = {
  presets: presets,
  plugins: plugins,
  exclude: "node_modules/**",
  // runtimeHelpers: true,
}
