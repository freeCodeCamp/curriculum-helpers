import { configDefaults, defineConfig } from "vitest/config";

const integrationTests = [
  "./packages/main/integration-tests/index.test.ts",
  "./packages/main/integration-tests/timeout.test.ts",
];

export default defineConfig({
  assetsInclude: ["**/*.py"],
  test: {
    environment: "puppeteer",
    exclude: [...configDefaults.exclude, "packages/*/build", "dist"],
    globals: true, // TODO: remove this OR include vitest types
    globalSetup: "vitest-environment-puppeteer/global-init",
    watchTriggerPatterns: [
      {
        pattern: /packages.*\.ts$/,
        testsToRun: (id) => {
          // If the changed file is a test, it's the only test that could be
          // affected.
          const isTestFile = id.endsWith(".test.ts");
          if (isTestFile) return id;

          // Otherwise, if there is a test file, this is it:
          const testFile = id.slice(0, -3) + ".test.ts";
          // In principle any source change could impact the integration tests
          return [...integrationTests, testFile];
        },
      },
    ],
  },
});
