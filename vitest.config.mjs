import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["./vitest.integration.config.mjs", "./vitest.unit.config.mjs"],
  },
});
