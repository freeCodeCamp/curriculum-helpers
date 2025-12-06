// packages/helpers/vitest.integration.config.mjs
export default {
  name: "helpers-integration",
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    globals: true,        // make describe/it available globally if tests expect it
    threads: false
  },
  // tell Vite/esbuild to ignore .py files as source code (treat them as assets)
  assetsInclude: ["**/*.py"]
};
