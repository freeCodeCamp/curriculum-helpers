const path = require("path");

console.info("Building in " + process.env.NODE_ENV + " mode.");
module.exports = {
  mode: process.env.NODE_ENV ? "production" : "development",
  entry: {
    index: "./lib/index.ts",
  },
  devtool: process.env.NODE_ENV ? "source-map" : "inline-source-map",
  output: {
    library: {
      name: "helpers",
      type: "umd",
    },
  },
  module: {
    rules: [
      {
        test: /\.([cm]?ts|tsx)$/,
        include: path.resolve(__dirname, "lib"),
        loader: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    extensionAlias: {
      ".ts": [".js", ".ts"],
      ".cts": [".cjs", ".cts"],
      ".mts": [".mjs", ".mts"],
    },
  },
};
