/** @type {import('jest').Config} */
const config = {
  preset: "jest-puppeteer",
  globalSetup: "./jest-setup.mjs",
  moduleNameMapper: {
    // We don't use the python scripts in the tests, so we can mock them with
    // a simple script that does nothing.
    "python/(.*.py)":
      "<rootDir>/packages/helpers/python/__mocks__/mock-script.ts",
  },
  testPathIgnorePatterns: ["dist", "packages\/[^/]*\/build"],
};

module.exports = config;
