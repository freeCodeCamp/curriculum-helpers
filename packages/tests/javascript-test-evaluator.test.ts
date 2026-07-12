/* @jest-environment jsdom */

import { JavascriptTestEvaluator } from "../javascript-evaluator/src/javascript-test-evaluator";

describe("JavascriptTestEvaluator", () => {
  let evaluator: JavascriptTestEvaluator;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    evaluator = new JavascriptTestEvaluator();
    evaluator.init({ code: {}, source: "" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runTest", () => {
    it("should handle tests that end in a comment", async () => {
      const test = "// something that does not throw an error";

      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({ pass: true });
    });

    it("should handle incorrect source that ends in a comment", async () => {
      evaluator.init({
        code: {},
        source: `
const x = 2;
// trailing comment`,
      });

      const test = "assert.equal(x, 1)";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        err: {
          message: "expected 2 to equal 1",
          expected: 1,
          actual: 2,
          name: "AssertionError",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("AssertionError: expected"),
        },
      });
    });

    it("should handle correct source that ends in a comment", async () => {
      evaluator.init({
        code: {},
        source: `
const x = 1;
// trailing comment`,
      });

      const test = "assert.equal(x, 1)";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({ pass: true });
    });

    it("should handle a test that throws an error", async () => {
      const test = "throw new Error('test error')";

      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        err: {
          message: "test error",
          name: "Error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("Error: test error"),
        },
      });
    });

    it("should handle a test that throws an error with expected and actual values", async () => {
      const test = "assert.equal('actual', 'expected')";

      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        err: {
          message: "expected 'actual' to equal 'expected'",
          name: "AssertionError",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("AssertionError: expected"),
          expected: "expected",
          actual: "actual",
        },
      });
    });

    it("should use the init source when running a test", async () => {
      evaluator.init({ code: {}, source: "let x = 1" });

      const test = "assert.equal(x, 2)";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        err: {
          message: "expected 1 to equal 2",
          name: "AssertionError",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("AssertionError: expected"),
          expected: 2,
          actual: 1,
        },
      });
    });

    it("should still run tests against code if the source throws", async () => {
      const source = "throw Error('expected')";
      evaluator.init({ code: { contents: source }, source });

      const test = `assert.equal(code, \`${source}\`)`;
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        pass: true,
        logs: [
          {
            level: "error",
            msg: "Error: expected",
          },
        ],
      });
    });

    // This may not be doable, but it's worth investigating.
    it.todo("should handle user code that overwrites `code`");

    it("should be able to declare variables in the test that are already declared in the source", async () => {
      evaluator.init({ code: {}, source: "const x = 1; const y = 2;" });

      // If you naively eval the source + test, that would be
      //
      // `const x = 1; const y = 2; const x = 2; assert.equal(y, 2)`
      //
      // which would throw an error because you're redeclaring x
      const test = "const x = 2; assert.equal(y, 2)";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({ pass: true });
    });

    // This is probably behavior we want, but it's not how the client works at
    // the moment.
    it.fails("should NOT handle async sources (yet)", async () => {
      evaluator.init({
        code: {},
        source: `let delay = () => new Promise((resolve) => setTimeout(resolve, 10));
let x = 1;
await delay();
x = 2;`,
      });
      const test = "assert.equal(x, 2)";
      const result = await evaluator.runTest(test);
      expect(result).toStrictEqual({ pass: true });
    });

    it("should handle async tests", async () => {
      evaluator.init({
        code: {},
        source: "const x = 1;",
      });
      const test = `await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(x, 1)`;
      const result = await evaluator.runTest(test);
      expect(result).toStrictEqual({ pass: true });
    });

    it("should have access to the curriculum-helpers", async () => {
      const test = `assert.equal(typeof __helpers, 'object')`;

      const result = await evaluator.runTest(test);
      expect(result).toStrictEqual({ pass: true });
    });

    it("should not be possible for user code to modify the __helpers object", async () => {
      const tryToModify = `__helpers.newProperty = 'newProperty';`;
      await evaluator.runTest(tryToModify);

      const checkUnchanged = `assert.isUndefined(__helpers.newProperty)`;
      const result = await evaluator.runTest(checkUnchanged);

      expect(result).toStrictEqual({
        pass: true,
      });
    });

    it("should not be possible for user code to modify the assert object", async () => {
      const tryToModify = `assert.newProperty = 'newProperty';`;
      await evaluator.runTest(tryToModify);

      const checkUnchanged = `assert.isUndefined(assert.newProperty)`;
      const result = await evaluator.runTest(checkUnchanged);

      expect(result).toStrictEqual({
        pass: true,
      });
    });

    it("error response should include the name of IndexOfBoundsError when thrown in user code", async () => {
      evaluator.init({
        code: {},
        source: `
x = 0;`,
      });

      const test = "assert.equal(x, 0)";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        err: {
          message: "x is not defined",
          name: "ReferenceError",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("ReferenceError: x"),
        },
        logs: [
          {
            level: "error",
            msg: "ReferenceError: x is not defined",
          },
        ],
      });
    });
  });
});
