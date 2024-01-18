const path = require("path");

console.info("Building in " + process.env.NODE_ENV + " mode.");
const baseConfig = {
  mode: process.env.NODE_ENV,
  entry: {
    index: "./lib/index.ts",
  },
  devtool:
    process.env.NODE_ENV === "production" ? "source-map" : "inline-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, "lib"),
        loader: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    extensionAlias: {
      ".ts": [".js", ".ts"],
    },
  },
};

const nodeConfig = {
  ...baseConfig,
  target: "node",
  output: {
    library: {
      type: "umd",
    },
    filename: "index.node.js",
    path: path.resolve(__dirname, "dist"),
  },
};

const browserConfig = {
  ...baseConfig,
  target: "web",
  experiments: {
    outputModule: true,
  },
  output: {
    library: {
      type: "module",
      // type: "commonjs-static",
    },
    filename: "index.browser.js",
    path: path.resolve(__dirname, "dist"),
  },
};

module.exports = [nodeConfig, browserConfig];
