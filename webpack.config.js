const path = require("path");
const webpack = require("webpack");

const formatExceptionBaseConfig = {
  entry: {
    "format-exception": path.resolve(
      __dirname,
      "packages/helpers/python/index.ts",
    ),
  },
  module: {
    rules: [
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

const formatExceptionNodeConfig = (env = {}) => {
  const isDev = env.development;
  return {
    ...formatExceptionBaseConfig,
    name: "format-exception-commonjs",
    mode: isDev ? "development" : "production",
    devtool: !isDev ? "source-map" : "inline-source-map",
    target: "node",
    output: {
      library: {
        type: "commonjs",
      },
      filename: "[name].cjs",
      path: path.resolve(__dirname, "dist/curriculum-helpers"),
    },
  };
};

const formatExceptionBrowserConfig = (env = {}) => {
  const isDev = env.development;
  return {
    ...formatExceptionBaseConfig,
    name: "format-exception-browser",
    mode: isDev ? "development" : "production",
    devtool: !isDev ? "source-map" : "inline-source-map",
    target: "web",
    experiments: {
      outputModule: true,
    },
    output: {
      library: {
        type: "module",
      },
      filename: "[name].mjs",
      path: path.resolve(__dirname, "dist/curriculum-helpers"),
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
    isWorker: true,
  },
  {
    name: "python-test-evaluator",
    path: __dirname + "/packages/python-evaluator/src",
    isWorker: true,
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

const getTSRules = (isDev) =>
  allSources.map(({ name, path }) => ({
    test: /\.ts$/,
    include: path,
    use: [
      {
        loader: "ts-loader",
        options: {
          projectReferences: true,
          instance: name,
          transpileOnly: isDev, // we use tsc for type checking, but we need the declaration files to be generated in production
        },
      },
    ],
    exclude: /node_modules/,
  }));

const testRunnerConfig =
  (entry, name, isWorker) =>
  (env = {}) => {
    const isDev = env.development;
    return {
      name: `test-runner-${name}`,
      mode: isDev ? "development" : "production",
      cache: isDev ? { type: "filesystem" } : false,
      entry,
      output: {
        filename: "[name].js",
        // during testing, we need the files to be available for the test server:
        path: isDev
          ? __dirname + "/__fixtures__/dist"
          : __dirname + "/dist/test-runner",
        ...(isWorker && { chunkLoading: "import-scripts" }),
      },
      module: {
        rules: [
          {
            test: /\.py/,
            type: "asset/source",
          },
          ...getTSRules(isDev),
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

const testRunnerConfigs = entrypointSources.map(({ name, path, isWorker }) => {
  const entry = { [name]: `${path}/${name}.ts` };

  return testRunnerConfig(entry, name, isWorker);
});

module.exports = [
  formatExceptionNodeConfig,
  formatExceptionBrowserConfig,
  ...testRunnerConfigs,
];
