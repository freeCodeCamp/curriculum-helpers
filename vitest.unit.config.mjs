import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  assetsInclude: ["**/*.py"],
  test: {
    name: "unit",
    globals: true, // TODO: remove this OR include vitest types
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      ...configDefaults.exclude,
      "packages/*/build",
      "dist",
      "packages/tests/integration-tests",
    ],
  },
});
