/** @type {import('jest').Config} */
const config = {
  moduleNameMapper: {
    // We don't use the python scripts in the tests, so we can mock them with
    // a simple script that does nothing.
    "python/(.*.py)": "<rootDir>/python/__mocks__/mock-script.ts",
  },
};

module.exports = config;
