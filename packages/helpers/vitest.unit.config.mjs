// packages/helpers/vitest.unit.config.mjs
export default {
  name: "helpers-unit",
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    globals: true,
    threads: false
  },
  assetsInclude: ["**/*.py"]
};
