/* eslint-disable no-eval */
import { assert } from "chai";

import * as curriculumHelpers from "../../helpers/lib";

import type {
  TestEvaluator,
  Fail,
  InitEvent,
  TestEvent,
  InitWorkerOptions,
} from "../../shared/src/interfaces/test-evaluator";
import type { ReadyEvent } from "../../shared/src/interfaces/test-runner";
import { postCloneableMessage } from "../../shared/src/messages";
import { format } from "../../shared/src/format";
import { ProxyConsole, createLogFlusher } from "../../shared/src/proxy-console";
import { evalWithScope } from "../../shared/src/test-with-scope";

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };
declare global {
  // eslint-disable-next-line no-var
  var __userCodeWasExecuted: boolean;
}

function createTestScope(opts: InitWorkerOptions) {
  return {
    code: opts.code?.contents ?? "",
    editableContents: opts.code?.editableContents ?? "",
    __helpers: curriculumHelpers,
    assert,
  };
}

Object.freeze(curriculumHelpers);
Object.freeze(assert);

// The newline is important, because otherwise comments will cause the trailing
// `}` to be ignored, breaking the tests.
const wrapCode = (code: string) => `await (async () => {${code};
})();`;

// TODO: currently this is almost identical to DOMTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class JavascriptTestEvaluator implements TestEvaluator {
  #runTest?: TestEvaluator["runTest"];
  #proxyConsole: ProxyConsole;
  #flushLogs: ReturnType<typeof createLogFlusher>;

  constructor(proxyConsole: ProxyConsole = new ProxyConsole(self.console)) {
    this.#proxyConsole = proxyConsole;
    this.#flushLogs = createLogFlusher(this.#proxyConsole, format);
  }

  init(opts: InitWorkerOptions) {
    eval(opts.hooks?.beforeAll ?? "");

    const testScope = createTestScope(opts);

    this.#runTest = async (rawTest) => {
      this.#proxyConsole.on();
      globalThis.__userCodeWasExecuted = false;
      const test = wrapCode(rawTest);

      try {
        try {
          const toEval = `${opts.hooks?.beforeEach ?? ""}
${opts.source};
globalThis.__userCodeWasExecuted = true;
${test};`;
          await evalWithScope(toEval, testScope);
        } catch (err) {
          if (globalThis.__userCodeWasExecuted) {
            // Rethrow error, since test failed.
            throw err;
          } else {
            console.error(err);
            // Otherwise run the test against the code
            await evalWithScope(test, testScope);
          }
        }

        return { pass: true, ...this.#flushLogs() };
      } catch (err: unknown) {
        this.#proxyConsole.off();
        console.error(err);
        const error = err as Fail["err"];

        return {
          err: {
            message: error.message,
            stack: error.stack,
            ...(!!error.expected && { expected: error.expected }),
            ...(!!error.actual && { actual: error.actual }),
          },
          ...this.#flushLogs(),
        };
      } finally {
        this.#proxyConsole.off();
      }
    };
  }

  async runTest(test: string) {
    return this.#runTest!(test);
  }

  async handleMessage(
    e: TestEvent | InitEvent<InitWorkerOptions>,
  ): Promise<void> {
    if (e.data.type === "test") {
      const result = await this.#runTest!(e.data.value);
      const msg = { type: "result" as const, value: result };
      postCloneableMessage((msg) => e.ports[0].postMessage(msg), msg);
    } else if (e.data.type === "init") {
      this.init(e.data.value);
      postMessage(READY_MESSAGE);
    }
  }
}

const worker = new JavascriptTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions>) {
  void worker.handleMessage(e);
};
