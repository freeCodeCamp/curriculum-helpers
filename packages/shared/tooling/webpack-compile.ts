import { spawnSync } from "child_process";
import { rmSync, existsSync } from "fs";
import path from "path";

const __dirname = new URL(".", import.meta.url).pathname;

const FIXTURES_DIR = path.join(__dirname, "../../../__fixtures__/dist");

export const compileForTests = () => {
  // It's necessary to manually remove the previous build artifacts so we can
  // check that the build is successful. This should not be necessary, but
  // webpack can fail silently.
  rmSync(FIXTURES_DIR, { recursive: true, force: true });

  // It's necessary spawnSync the webpack process to ensure that the build is
  // complete before the tests start
  const result = spawnSync(
    "webpack",
    // We only need the test-runner to be compiled for testing.
    ["--color", "--env", "development", "--config-name", "test-runner"],
    {
      encoding: "utf8",
    },
  );

  if (!existsSync(FIXTURES_DIR)) {
    console.log(result.stdout);
    console.error(result.stderr);
    console.error(
      `Webpack build failed. The dist folder, ${FIXTURES_DIR}, was not created.`,
    );
  }

  // Only log if there is an error
  if (result.status) {
    console.log(result.stdout);
    console.error(result.stderr);
  }
};
