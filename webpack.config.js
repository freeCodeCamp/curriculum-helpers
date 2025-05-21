const path = require("path");
const webpack = require("webpack");

const reportMode = (isDev, bundle) => {
  console.info(
    `Building ${bundle} in ${isDev ? "development" : "production"} mode...`,
  );
};

const baseConfig = {
  entry: {
    index: path.resolve(__dirname, "packages/helpers/lib/index.ts"),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, "packages/helpers/"),
        loader: "ts-loader",
        options: {
          projectReferences: true,
        },
      },
      {
        test: /\.py/,
        type: "asset/source",
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

const nodeConfig = (env = {}) => {
  const isDev = env.development;
  reportMode(isDev, "commonjs bundle");
  return {
    ...baseConfig,
    mode: isDev ? "development" : "production",
    devtool: !isDev ? "source-map" : "inline-source-map",
    target: "node",
    output: {
      library: {
        type: "commonjs",
      },
      filename: "index.cjs",
      path: path.resolve(__dirname, "dist/helpers/assets"),
    },
  };
};

const browserConfig = (env = {}) => {
  const isDev = env.development;
  reportMode(isDev, "browser bundle");
  return {
    ...baseConfig,
    mode: isDev ? "development" : "production",
    devtool: !isDev ? "source-map" : "inline-source-map",
    target: "web",
    experiments: {
      outputModule: true,
    },
    output: {
      library: {
        type: "module",
        // type: "commonjs-static",
      },
      filename: "index.mjs",
      path: path.resolve(__dirname, "dist/helpers/assets"),
    },
  };
};

// ts-loader doesn't seem to support multiple entry points, so we need to create
// multiple sets of rules for each entry point.
const entrypointSources = [
  {
    name: "index",
    path: __dirname + "/packages/main/src",
  },
  {
    name: "dom-test-evaluator",
    path: __dirname + "/packages/dom-evaluator/src",
  },
  {
    name: "javascript-test-evaluator",
    path: __dirname + "/packages/javascript-evaluator/src",
  },
  {
    name: "python-test-evaluator",
    path: __dirname + "/packages/python-evaluator/src",
  },
];

const sharedSources = [
  {
    name: "shared",
    path: __dirname + "/packages/shared/src",
  },
  {
    name: "helpers",
    path: __dirname + "/packages/helpers",
  },
];

const allSources = [...entrypointSources, ...sharedSources];

const entry = entrypointSources.reduce(
  (acc, { name, path }) => ({
    ...acc,
    [name]: `${path}/${name}.ts`,
  }),
  {},
);

const tsRules = allSources.map(({ name, path }) => ({
  test: /\.ts$/,
  include: path,
  use: [
    {
      loader: "ts-loader",
      options: {
        projectReferences: true,
        instance: name,
      },
    },
  ],
  exclude: /node_modules/,
}));

const testRunnerConfig = (env = {}) => {
  const isDev = env.development;
  reportMode(isDev, "test runner bundle");
  return {
    mode: isDev ? "development" : "production",
    cache: isDev ? { type: "filesystem" } : false,
    entry,
    output: {
      filename: "[name].js",
      // during testing, we need the files to be available for the test server:
      path: isDev
        ? __dirname + "/__fixtures__/dist"
        : __dirname + "/dist/test-runner/assets",
        clean: true,
    },
    module: {
      rules: [
        {
          test: /\.py/,
          type: "asset/source",
        },
        ...tsRules,
      ],
    },
    resolve: {
      fallback: {
        // buffer: require.resolve("buffer"),
        util: require.resolve("util"),
        stream: false,
        process: require.resolve("process/browser.js"),
        timers: require.resolve("timers-browserify"),
      },
      extensions: [".ts", ".js"],
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
      // @sinon/fake-timers can use 'timers/promises' if it's available, but
      // 'timers-browserify' does not include it. This means webpack has to be
      // told to ignore it, otherwise it will throw an error when trying to
      // build.
      new webpack.IgnorePlugin({
        resourceRegExp: /timers\/promises/,
      }),
    ],
  };
};

module.exports = [nodeConfig, browserConfig, testRunnerConfig];
