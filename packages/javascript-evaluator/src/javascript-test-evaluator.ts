/* eslint-disable no-eval */
import { assert as chaiAssert } from "chai";

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

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };
declare global {
  // @ts-expect-error chai is not accessible in the global scope, but TS thinks it is
  var assert: typeof chaiAssert;
  var __helpers: typeof curriculumHelpers;
}
// These have to be added to the global scope or they will get eliminated as dead
// code.
globalThis.assert = chaiAssert;
globalThis.__helpers = curriculumHelpers;

Object.freeze(globalThis.__helpers);
Object.freeze(globalThis.assert);

// The newline is important, because otherwise comments will cause the trailing
// `}` to be ignored, breaking the tests.
const wrapCode = (code: string) => `(async () => {${code};
})();`;

// TODO: currently this is almost identical to DOMTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class JavascriptTestEvaluator implements TestEvaluator {
  #runTest?: TestEvaluator["runTest"];
  #proxyConsole: ProxyConsole;
  #flushLogs: ReturnType<typeof createLogFlusher>;

  constructor(
    proxyConsole: ProxyConsole = new ProxyConsole(globalThis.console),
  ) {
    this.#proxyConsole = proxyConsole;
    this.#flushLogs = createLogFlusher(this.#proxyConsole, format);
  }

  init(opts: InitWorkerOptions) {
    eval(opts.hooks?.beforeAll ?? "");

    this.#runTest = async (rawTest) => {
      this.#proxyConsole.on();
      const test = wrapCode(rawTest);
      // This can be reassigned by the eval inside the try block, so it should be declared as a let
      // eslint-disable-next-line prefer-const
      let __userCodeWasExecuted = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const code = opts.code?.contents ?? "";
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const editableContents = opts.code?.editableContents ?? "";
        try {
          await eval(`${opts.hooks?.beforeEach ?? ""}
${opts.source};
__userCodeWasExecuted = true;
${test};`);
        } catch (err) {
          if (__userCodeWasExecuted) {
            // Rethrow error, since test failed.
            throw err;
          } else {
            console.error(err);
            // Otherwise run the test against the code
            await eval(test);
          }
        }

        if (opts.hooks?.afterEach) eval(opts.hooks.afterEach);

        return { pass: true, ...this.#flushLogs() };
      } catch (err: unknown) {
        this.#proxyConsole.off();
        console.error(err);

        try {
          if (opts.hooks?.afterEach) eval(opts.hooks.afterEach);
        } catch (afterEachErr) {
          // Even though we're returning the original test error, we still
          // want to log for debugging purposes.
          console.error("Error in afterEach hook:", afterEachErr);
        }

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
