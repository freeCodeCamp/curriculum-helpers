import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/coverage", "dist/", "docs/tools/", "theme/", "**/webpack.config.js"]),
    {
        extends: compat.extends(
            "xo",
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            "prettier",
        ),

        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
            },

            parser: tsParser,
        },

        rules: {
            complexity: "off",
            "@typescript-eslint/no-namespace": "off",
            "no-warning-comments": "off",

            camelcase: ["warn", {
                allow: ["function_parameters", "function_body", "function_indentation"],
            }],
        },
    },
]);
