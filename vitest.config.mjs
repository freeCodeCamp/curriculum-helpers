import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  assetsInclude: ["**/*.py"],
  test: {
    environment: "puppeteer",
    exclude: [...configDefaults.exclude, "packages/*/build", "dist"],
    globals: true, // TODO: remove this OR include vitest types
    globalSetup: "vitest-environment-puppeteer/global-init",
  },
});
