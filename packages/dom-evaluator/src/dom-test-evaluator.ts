/* eslint-disable no-eval */
import jQuery from "jquery";
import * as helpers from "../../helpers/lib";
import FakeTimers from "@sinonjs/fake-timers";
import { assert as chaiAssert } from "chai";

import type {
  TestEvaluator,
  Fail,
  CodeEvent,
  TestEvent,
  TestError,
  InitEvent,
  Pass,
  InitTestFrameOptions,
} from "../../shared/src/interfaces/test-evaluator";
import type { ReadyEvent } from "../../shared/src/interfaces/test-runner";

import { postCloneableMessage } from "../../shared/src/messages";
import {
  TEST_EVALUATOR_SCRIPT_ID,
  TEST_EVALUATOR_HOOKS_ID,
} from "../../shared/src/ids";
import { MockLocalStorage } from "./mock-local-storage";
import { ProxyConsole } from "../../shared/src/proxy-console";
import { format } from "../../shared/src/format";
import { createAsyncIife } from "../../shared/src/async-iife";
import { createFetchProxy } from "../../shared/src/proxy-fetch";

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };

declare global {
  var __FakeTimers: typeof FakeTimers;
  var assert: typeof chaiAssert;
  var __helpers: typeof helpers;
}

// @ts-expect-error jQuery cannot be declared.
globalThis.$ = jQuery;
globalThis.__FakeTimers = FakeTimers;
globalThis.assert = chaiAssert;
globalThis.__helpers = helpers;

// Local storage is not accessible in a sandboxed iframe, so we need to mock it
Object.defineProperty(globalThis, "localStorage", {
  value: new MockLocalStorage(),
});

const removeTestScripts = () => {
  const parentScript = document.getElementById(TEST_EVALUATOR_SCRIPT_ID);
  parentScript?.remove();
  const hooksScript = document.getElementById(TEST_EVALUATOR_HOOKS_ID);
  hooksScript?.remove();
};

// Prevent form submissions from navigating the page. If we don't do this, the
// iframe's browsing context could be replaced destroying the test runner.
document.addEventListener("submit", (e) => {
  e.preventDefault();
});

// @ts-expect-error The proxy doesn't fully implement the fetch API
globalThis.fetch = createFetchProxy(parent);

export class DOMTestEvaluator implements TestEvaluator {
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

  async init(opts: InitTestFrameOptions) {
    removeTestScripts();
    const codeObj = opts.code;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const code = (codeObj?.contents ?? "").slice();

    const editableContents = (codeObj?.editableContents ?? "").slice();
    // __testEditable allows test authors to run tests against a transitory dom
    // element built using only the code in the editable region.
    const __testEditable = (cb: () => () => unknown) => {
      const div = document.createElement("div");
      div.id = "editable-only";
      div.innerHTML = editableContents;
      document.body.appendChild(div);
      const out = cb();
      document.body.removeChild(div);
      return out;
    };

    /* eslint-disable @typescript-eslint/no-unused-vars */

    // Hardcode Deep Freeze dependency
    const DeepFreeze = (o: Record<string, unknown>) => {
      Object.freeze(o);
      Object.getOwnPropertyNames(o).forEach((prop) => {
        if (
          Object.hasOwn(o, prop) &&
          o[prop] !== null &&
          (typeof o[prop] === "object" || typeof o[prop] === "function") &&
          !Object.isFrozen(o[prop])
        ) {
          // eslint-disable-next-line new-cap
          DeepFreeze(o[prop] as Record<string, unknown>);
        }
      });
      return o;
    };

    let Enzyme;
    if (opts.loadEnzyme) {
      let Adapter16;

      [{ default: Enzyme }, { default: Adapter16 }] = await Promise.all([
        import(/* webpackChunkName: "enzyme" */ "enzyme"),
        import(
          /* webpackChunkName: "enzyme-adapter" */ "enzyme-adapter-react-16"
        ),
      ]);

      Enzyme.configure({ adapter: new Adapter16() });
    }

    this.#runTest = async function (rawTest: string): Promise<Fail | Pass> {
      this.#proxyConsole.on();

      try {
        const testWithBefore = `${opts.hooks?.beforeEach ?? ""};
${rawTest}`;
        const test = createAsyncIife(testWithBefore);

        await eval(test);

        return { pass: true, ...this.#proxyConsole.flush() };
      } catch (err) {
        this.#proxyConsole.off();
        console.error(err);

        const error = err as Fail["err"];
        // To provide useful debugging information when debugging the tests, we
        // have to extract the message, stack and, if they exist, expected and
        // actual before returning
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

    return Promise.resolve();
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
    e: CodeEvent | TestEvent | InitEvent<InitTestFrameOptions>,
  ): Promise<void> {
    const respond = (msg: unknown) => e.ports[0].postMessage(msg);
    if (e.data.type === "test") {
      const result = await this.#runTest!(e.data.value);
      const msg = { type: "result" as const, value: result };
      postCloneableMessage(respond, msg);
    } else if (e.data.type === "init") {
      await this.init(e.data.value);
      respond(READY_MESSAGE);
    } else if (e.data.type === "code") {
      // This is used to run arbitrary non-test code, such as the afterAll hook.
      await this.runCode(e.data.value);
      respond({ type: "code" });
    }
  }
}

const evaluator = new DOMTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitTestFrameOptions>) {
  if (e.source !== self.parent) {
    return;
  }

  void evaluator.handleMessage(e);
};
