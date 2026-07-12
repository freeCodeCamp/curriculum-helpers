/* @jest-environment jsdom */

import { DOMTestEvaluator } from "../dom-evaluator/src/dom-test-evaluator";

// This is a limited reset, but should be enough if we only add or remove
// elements.
const resetDocument = () => {
  document.body.innerHTML = "";
};

describe("DOMTestEvaluator", () => {
  let evaluator: DOMTestEvaluator;

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    evaluator = new DOMTestEvaluator();
    await evaluator.init({ code: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runTest", () => {
    it("should evaluate a test in the evaluator environment", async () => {
      const test = "// something that does not throw an error";

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
      const test = "assert.equal('actual', 'expected', 'test error')";

      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({
        err: {
          message: "test error: expected 'actual' to equal 'expected'",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("Error: test error"),
          name: "AssertionError",
          expected: "expected",
          actual: "actual",
        },
      });
    });

    it("should test against the enclosing document", async () => {
      resetDocument();
      document.body.appendChild(document.createElement("div"));
      document.body.appendChild(document.createElement("div"));

      const test = "assert.equal(document.querySelectorAll('div').length, 2)";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({ pass: true });
    });

    it("should be able to test styles", async () => {
      resetDocument();
      const style = document.createElement("style");
      style.innerHTML = "body { color: red; }";
      document.body.appendChild(style);

      const test =
        "assert.equal(getComputedStyle(document.querySelector('body')).color, 'red')";
      const result = await evaluator.runTest(test);

      expect(result).toStrictEqual({ pass: true });
    });
  });
});
