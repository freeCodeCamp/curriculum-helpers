/* @jest-environment jsdom */

import { DOMTestEvaluator } from "./dom-test-evaluator";

// This is a limited reset, but should be enough if we only add or remove
// elements.
const resetDocument = () => {
	document.body.innerHTML = "";
};

describe("DOMTestEvaluator", () => {
	let evaluator: DOMTestEvaluator;

	beforeEach(async () => {
		jest.spyOn(console, "error").mockImplementation(jest.fn());
		evaluator = new DOMTestEvaluator();
		await evaluator.init({ code: {} });
	});

	afterEach(() => {
		jest.restoreAllMocks();
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

		it("should await tests that return promises", async () => {
			const test = `new Promise((resolve) => setTimeout(resolve, 1))
			  .then(() => { assert.equal(1,2)});`;

			const result = await evaluator.runTest(test);
			expect(result).toStrictEqual({
				err: {
					message: "expected 1 to equal 2",
					expected: 2,
					actual: 1,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("AssertionError: expected"),
				},
			});
		});
	});
});
