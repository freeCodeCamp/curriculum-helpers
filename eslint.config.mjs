import xo from "eslint-config-xo";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";
import js from "@eslint/js";

export default tseslint.config(
  {
    ignores: [
      "**/coverage",
      "dist/",
      "docs/tools/",
      "theme/",
      "**/webpack.config.js",
      "**/build",
      // TODO: lint fixtures and test, but make sure they don't end up in the
      // bundle
      "**/__fixtures__",
      "**/__tests__",
      "**/__mocks__",
    ],
  },
  {
    extends: [
      xo,
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      prettier,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: "off",
      "@typescript-eslint/no-namespace": "off",
      "no-warning-comments": "off",
      "no-implicit-coercion": "off",
      "no-void": ["error", { allowAsStatement: true }],

      camelcase: [
        "warn",
        {
          allow: [
            "function_parameters",
            "function_body",
            "function_indentation",
          ],
        },
      ],
    },
    files: ["**/*.ts"],
  },
);
