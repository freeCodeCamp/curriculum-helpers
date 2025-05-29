import { DOMTestRunner, WorkerTestRunner } from "./test-runner";

declare global {
	interface Window {
		FCCTestRunner: FCCTestRunner;
	}
}

class FCCTestRunner {
	#DOMRunner: DOMTestRunner | null;
	#javascriptRunner: WorkerTestRunner | null;
	#pythonRunner: WorkerTestRunner | null;

	constructor() {
		this.#DOMRunner = null;
		this.#javascriptRunner = null;
		this.#pythonRunner = null;
	}
	getRunner(
		type: "dom" | "javascript" | "python",
	): DOMTestRunner | WorkerTestRunner | null {
		switch (type) {
			case "dom":
				return this.#DOMRunner;
			case "javascript":
				return this.#javascriptRunner;
			case "python":
				return this.#pythonRunner;
		}
	}

	async createTestRunner({
		source,
		type,
		code,
		assetPath,
		hooks,
		loadEnzyme,
	}: {
		// the compiled user code, evaluated before the tests.
		source?: string;
		type: "dom" | "javascript" | "python";
		// TODO: can we avoid using `assetPath` and use `import.meta.url` instead?
		assetPath?: string;
		// the original user code, available for the tests to use.
		code?: { contents?: string; editableContents?: string };
		hooks?: {
			beforeAll?: string;
		};
		loadEnzyme?: boolean;
	}) {
		let testRunner: DOMTestRunner | WorkerTestRunner | null = null;
		switch (type) {
			case "dom":
				if (!this.#DOMRunner) {
					this.#DOMRunner = new DOMTestRunner({
						assetPath,
						script: "dom-test-evaluator.js",
					});
				}
				testRunner = this.#DOMRunner;
				break;
			case "javascript":
				if (!this.#javascriptRunner) {
					this.#javascriptRunner = new WorkerTestRunner({
						assetPath,
						script: "javascript-test-evaluator.js",
					});
				}
				testRunner = this.#javascriptRunner;
				break;
			case "python":
				if (!this.#pythonRunner) {
					this.#pythonRunner = new WorkerTestRunner({
						assetPath,
						script: "python-test-evaluator.js",
					});
				}
				testRunner = this.#pythonRunner;
				break;
		}
		await testRunner.init({ code, source, loadEnzyme, hooks });

		return testRunner;
	}
}

window.FCCTestRunner = new FCCTestRunner();
