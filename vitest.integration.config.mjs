import { configDefaults, defineConfig } from "vitest/config";

const integrationTests = [
  "./packages/tests/integration-tests/python-hooks.test.ts",
  "./packages/tests/integration-tests/index.test.ts",
  "./packages/tests/integration-tests/timeout.test.ts",
];

export default defineConfig({
  test: {
    watchTriggerPatterns: [
      {
        pattern: /packages\/.*\/.*\.ts$/,
        testsToRun: () => {
          // Any source change could impact the integration tests
          return integrationTests;
        },
      },
    ],
    name: "integration",
    globals: true, // TODO: remove this OR include vitest types
    environment: "puppeteer",
    include: integrationTests,
    exclude: [...configDefaults.exclude, "packages/*/build", "dist"],
    globalSetup: [
      "./packages/shared/tooling/webpack-compile.ts",
      "vitest-environment-puppeteer/global-init",
    ],
  },
});
