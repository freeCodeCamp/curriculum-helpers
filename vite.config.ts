import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es6",
    outDir: "vite",
    lib: {
      entry: "lib/index.ts",
      name: "__helpers",
      formats: ["cjs"],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        inlineDynamicImports: false,
        format: "cjs",
      },
    },
  },
});
