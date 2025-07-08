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

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };

declare global {
  var __FakeTimers: typeof FakeTimers;
  var assert: typeof chaiAssert;
}

// @ts-expect-error jQuery cannot be declared.
globalThis.$ = jQuery;
globalThis.__FakeTimers = FakeTimers;
globalThis.assert = chaiAssert;

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

export class DOMTestEvaluator implements TestEvaluator {
  #runTest?: TestEvaluator["runTest"];
  #proxyConsole: ProxyConsole;

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

    const __helpers = helpers;

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
        let test;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          test = await eval(`${opts.hooks?.beforeEach ?? ""}
${rawTest}`);
        } catch (err) {
          if (
            err instanceof SyntaxError &&
            err.message.includes(
              "await is only valid in async functions and the top level bodies of modules",
            )
          ) {
            const iifeTest = createAsyncIife(rawTest);
            // There's no need to assign this to 'test', since it replaces that
            // functionality.
            await eval(iifeTest);
          } else {
            throw err;
          }
        }

        if (typeof test === "function") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          await test();
        }

        if (opts.hooks?.afterEach) eval(opts.hooks.afterEach);

        return { pass: true, ...this.#proxyConsole.flush() };
      } catch (err) {
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
        // To provide useful debugging information when debugging the tests, we
        // have to extract the message, stack and, if they exist, expected and
        // actual before returning
        return {
          err: {
            message: error.message,
            stack: error.stack,
            ...(!!error.expected && { expected: error.expected }),
            ...(!!error.actual && { actual: error.actual }),
          },
          ...this.#proxyConsole.flush(),
        };
      } finally {
        this.#proxyConsole.off();
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
