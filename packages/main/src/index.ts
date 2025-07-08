import { DOMTestRunner, WorkerTestRunner } from "./test-runner";

declare global {
  interface Window {
    FCCTestRunner: FCCTestRunner;
  }
}

interface EvaluatorConfig {
  // The compiled user code, evaluated before the tests.
  source?: string;
  type: "dom" | "javascript" | "python";
  // TODO: move assetPath to RunnerConfig when making a major version bump.
  assetPath?: string;
  // The original user code, available for the tests to use.
  code?: { contents?: string; editableContents?: string };
  hooks?: {
    beforeAll?: string;
    beforeEach?: string;
    afterEach?: string;
    afterAll?: string;
  };
  loadEnzyme?: boolean;
}

interface RunnerConfig {
  // This only applies to DOM tests for now.
  timeout?: number;
}

export class FCCTestRunner {
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
    // eslint-disable-next-line default-case
    switch (type) {
      case "dom":
        return this.#DOMRunner;
      case "javascript":
        return this.#javascriptRunner;
      case "python":
        return this.#pythonRunner;
    }
  }

  async createTestRunner(
    { source, type, code, assetPath, hooks, loadEnzyme }: EvaluatorConfig,
    { timeout }: RunnerConfig = { timeout: 20000 },
  ) {
    let testRunner: DOMTestRunner | WorkerTestRunner | null = null;
    // eslint-disable-next-line default-case
    switch (type) {
      case "dom":
        this.#DOMRunner ||= new DOMTestRunner({
          assetPath,
          script: "dom-test-evaluator.js",
        });
        testRunner = this.#DOMRunner;
        break;
      case "javascript":
        this.#javascriptRunner ||= new WorkerTestRunner({
          assetPath,
          script: "javascript-test-evaluator.js",
        });
        testRunner = this.#javascriptRunner;
        break;
      case "python":
        this.#pythonRunner ||= new WorkerTestRunner({
          assetPath,
          script: "python-test-evaluator.js",
        });
        testRunner = this.#pythonRunner;
        break;
    }

    await testRunner.init({ code, source, loadEnzyme, hooks }, timeout);

    return testRunner;
  }
}

window.FCCTestRunner = new FCCTestRunner();
