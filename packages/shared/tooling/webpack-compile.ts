import { spawnSync } from "child_process";
import { rmSync, existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const require = createRequire(import.meta.url);

const FIXTURES_DIR = path.join(__dirname, "../../../__fixtures__/dist");

export default function compileForTests() {
  // It's necessary to manually remove the previous build artifacts so we can
  // check that the build is successful. This should not be necessary, but
  // webpack can fail silently.
  rmSync(FIXTURES_DIR, { recursive: true, force: true });

  // It's necessary spawnSync the webpack process to ensure that the build is
  // complete before the tests start
  const result = spawnSync(
    process.execPath,
    // We only need the test-runner to be compiled for testing.
    [
      require.resolve("webpack-cli/bin/cli.js"),
      "--color",
      "--env",
      "development",
      "--config-name",
      "test-runner-index",
      "--config-name",
      "test-runner-dom-test-evaluator",
      "--config-name",
      "test-runner-javascript-test-evaluator",
      "--config-name",
      "test-runner-python-test-evaluator",
    ],
    {
      encoding: "utf8",
    },
  );

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(
      `Webpack build failed:\n${result.stdout}\n${result.stderr}`,
    );
  }

  if (!existsSync(FIXTURES_DIR)) {
    throw new Error(
      `Webpack build failed. The dist folder, ${FIXTURES_DIR}, was not created.`,
    );
  }

  const assetsDir = path.join(FIXTURES_DIR, "pyodide");
  mkdirSync(assetsDir, { recursive: true });
  for (const asset of [
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "python_stdlib.zip",
    "pyodide-lock.json",
  ]) {
    copyFileSync(
      require.resolve(`pyodide/${asset}`),
      path.join(assetsDir, asset),
    );
  }
}
