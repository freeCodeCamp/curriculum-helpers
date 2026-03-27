/* eslint-disable no-eval */
import { assert as chaiAssert } from "chai";

import * as curriculumHelpers from "../../helpers/lib";

import type {
  TestEvaluator,
  TestError,
  Fail,
  InitEvent,
  TestEvent,
  CodeEvent,
  InitWorkerOptions,
} from "../../shared/src/interfaces/test-evaluator";
import type { ReadyEvent } from "../../shared/src/interfaces/test-runner";
import { postCloneableMessage } from "../../shared/src/messages";
import { format } from "../../shared/src/format";
import { createAsyncIife } from "../../shared/src/async-iife";
import { ProxyConsole } from "../../shared/src/proxy-console";
import { createFetchProxy } from "../../shared/src/proxy-fetch";

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };
declare global {
  var assert: typeof chaiAssert;
  var __helpers: typeof curriculumHelpers;
}
// These have to be added to the global scope or they will get eliminated as dead
// code.
globalThis.assert = chaiAssert;
globalThis.__helpers = curriculumHelpers;

Object.freeze(globalThis.__helpers);
Object.freeze(globalThis.assert);

// TODO: currently this is almost identical to DOMTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class JavascriptTestEvaluator implements TestEvaluator {
  #runTest?: TestEvaluator["runTest"];
  #proxyConsole: ProxyConsole;

  #createErrorResponse(error: TestError) {
    return {
      err: {
        message: error.message,
        stack: error.stack,
        ...(!!error.expected && { expected: error.expected }),
        ...(!!error.actual && { actual: error.actual }),
        name: error.name,
      },
    };
  }

  constructor(
    proxyConsole: ProxyConsole = new ProxyConsole(globalThis.console, format),
  ) {
    this.#proxyConsole = proxyConsole;
  }

  init(opts: InitWorkerOptions) {
    // @ts-expect-error The proxy doesn't fully implement the fetch API
    globalThis.fetch = createFetchProxy(globalThis);

    eval(opts.hooks?.beforeAll ?? "");

    this.#runTest = async (rawTest) => {
      this.#proxyConsole.on();

      const test = createAsyncIife(rawTest);
      // This can be reassigned by the eval inside the try block, so it should be declared as a let
      // eslint-disable-next-line prefer-const
      let __userCodeWasExecuted = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const code = opts.code?.contents ?? "";
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const editableContents = opts.code?.editableContents ?? "";
        try {
          await eval(`${opts.hooks?.beforeEach ?? ""};
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

        return { pass: true, ...this.#proxyConsole.flush() };
      } catch (err: unknown) {
        this.#proxyConsole.off();
        console.error(err);

        const error = err as Fail["err"];

        return {
          ...this.#createErrorResponse(error),
          ...this.#proxyConsole.flush(),
        };
      } finally {
        this.#proxyConsole.off();

        try {
          if (opts.hooks?.afterEach) eval(opts.hooks.afterEach);
        } catch (afterEachErr) {
          // eslint-disable-next-line no-unsafe-finally
          return this.#createErrorResponse(afterEachErr as TestError);
        }
      }
    };
  }

  async runTest(test: string) {
    return this.#runTest!(test);
  }

  async runCode(code: string) {
    try {
      await eval(code);
    } catch (err) {
      // If the code throws an error, we want to log it to the console
      // so that it can be debugged.
      console.error("Error evaluating code:", code, err);
    }
  }

  async handleMessage(
    e: TestEvent | InitEvent<InitWorkerOptions> | CodeEvent,
  ): Promise<void> {
    const respond = (msg: unknown) => e.ports[0].postMessage(msg);
    if (e.data.type === "test") {
      const result = await this.#runTest!(e.data.value);
      const msg = { type: "result" as const, value: result };
      postCloneableMessage(respond, msg);
    } else if (e.data.type === "init") {
      this.init(e.data.value);
      respond(READY_MESSAGE);
    } else if (e.data.type === "code") {
      // This is used to run arbitrary non-test code, such as the afterAll hook.
      await this.runCode(e.data.value);
      respond({ type: "code" });
    }
  }
}

const worker = new JavascriptTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions> | CodeEvent) {
  void worker.handleMessage(e);
};
