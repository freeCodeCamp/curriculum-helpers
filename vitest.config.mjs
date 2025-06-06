import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  assetsInclude: ["**/*.py"],
  test: {
    environment: "puppeteer",
    exclude: [...configDefaults.exclude, "packages/*/build", "dist"],
    globals: true, // TODO: remove this OR include vitest types
    globalSetup: "vitest-environment-puppeteer/global-init",
    watchTriggerPatterns: [
      {
        pattern: /packages/,
        testsToRun: (id, match) => {
          // In principle any source change could impact the integration tests,
          return [
            `./packages/main/integration-tests/index.test.ts`,
            `./packages/main/integration-tests/timeout.test.ts`,
          ];
        },
      },
    ],
  },
});
