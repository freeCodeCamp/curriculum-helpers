/* eslint-disable no-eval */
// We have to specify pyodide.js because we need to import that file (not .mjs)
// and 'import' defaults to .mjs
import { loadPyodide, type PyodideInterface } from "pyodide/pyodide.js";
import type { PyProxy, PythonError } from "pyodide/ffi";
import pkg from "pyodide/package.json";
import * as helpers from "../../helpers/lib";
import chai from "chai";
import {
  Fail,
  InitEvent,
  InitWorkerOptions,
  Pass,
  TestEvaluator,
  TestEvent,
  CodeEvent,
  TestError,
} from "../../shared/src/interfaces/test-evaluator";
import { ReadyEvent } from "../../shared/src/interfaces/test-runner";
import { postCloneableMessage } from "../../shared/src/messages";
import { format } from "../../shared/src/format";
import { ProxyConsole } from "../../shared/src/proxy-console";
import { createAsyncIife } from "../../shared/src/async-iife";
import { createFetchProxy } from "../../shared/src/proxy-fetch";

declare global {
  var __helpers: typeof helpers;
}

globalThis.__helpers = helpers;

type EvaluatedTeststring = {
  test: () => Promise<unknown>;
};

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };

function isProxy(raw: unknown): raw is PyProxy {
  return !!raw && typeof raw === "object" && "toJs" in raw;
}

const serialize = (obj: unknown) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  isProxy(obj) ? (obj.toJs().toString() as string) : obj;

class PythonTestEvaluator implements TestEvaluator {
  #pyodide?: PyodideInterface;
  #runTest?: TestEvaluator["runTest"];
  #proxyConsole: ProxyConsole;

  #createErrorResponse(error: TestError) {
    const expected = serialize((error as { expected: unknown }).expected);
    const actual = serialize((error as { actual: unknown }).actual);
    return {
      err: {
        message: error.message,
        stack: error.stack,
        ...(!!expected && { expected }),
        ...(!!actual && { actual }),
        type: error.type,
      },
    };
  }

  constructor(
    proxyConsole: ProxyConsole = new ProxyConsole(globalThis.console, format),
  ) {
    this.#proxyConsole = proxyConsole;
  }

  async init(opts: InitWorkerOptions) {
    const pyodide = await this.#setupPyodide();
    // @ts-expect-error The proxy doesn't fully implement the fetch API
    globalThis.fetch = createFetchProxy(globalThis);
    eval(opts.hooks?.beforeAll ?? "");

    this.#runTest = async (rawTestString): Promise<Pass | Fail> => {
      this.#proxyConsole.on();
      const code = (opts.code?.contents ?? "").slice();
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const editableContents = (opts.code?.editableContents ?? "").slice();

      const { assert } = chai;

      // Create fresh globals for each test
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const __userGlobals = pyodide.globals.get("dict")() as PyProxy;

      // Some tests rely on __name__ being set to __main__ and we new dicts do not
      // have this set by default.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      __userGlobals.set("__name__", "__main__");

      // The runPython helper is a shortcut for running python code with our
      // custom globals.
      const runPython = (pyCode: string) =>
        pyodide.runPython(pyCode, { globals: __userGlobals }) as unknown;
      runPython(`from ast_helpers import Node as _Node`);

      // The tests need the user's code as a string, so we write it to the virtual
      // filesystem...
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      pyodide.FS.writeFile("/user_code.py", code, { encoding: "utf8" });

      // ...and then read it back into a variable so that they can evaluate it.
      runPython(`
		with open("/user_code.py", "r") as f:
			_code = f.read()
		`);

      /* eslint-enable @typescript-eslint/no-unused-vars */

      // If input is not faked, tests can fail with io exceptions.
      runPython(`
def __fake_input(arg=None):
  return ""

input = __fake_input
`);

      try {
        const testString = `${opts.hooks?.beforeEach ?? ""};
${rawTestString}`;
        // Eval test string to get the test property

        let evaluatedTestString;

        try {
          evaluatedTestString = eval(testString) as EvaluatedTeststring;
        } catch (err) {
          const isUsingTopLevelAwait =
            err instanceof SyntaxError &&
            err.message.includes(
              "await is only valid in async functions and the top level bodies of modules",
            );

          if (isUsingTopLevelAwait) {
            const iifeTest = createAsyncIife(testString);

            await eval(iifeTest);
          } else {
            throw err;
          }
        }

        // If the test string does not evaluate to an object, then we assume
        // that it's a standard JS test and any assertions have already passed.
        // Finally, if it is a Promise, that should have been awaited so we
        // ignore it.
        if (
          typeof evaluatedTestString !== "object" ||
          evaluatedTestString instanceof Promise
        ) {
          // Execute afterEach hook if it exists
          if (opts.hooks?.afterEach) eval(opts.hooks.afterEach);

          return { pass: true, ...this.#proxyConsole.flush() };
        }

        if (!evaluatedTestString || !("test" in evaluatedTestString)) {
          throw Error(
            "Test string did not evaluate to an object with the 'test' property",
          );
        }

        const { test } = evaluatedTestString;

        // Evaluates the learner's code so that any variables they define are
        // available to the test.
        runPython(opts.source ?? "");

        await test();

        return { pass: true, ...this.#proxyConsole.flush() };
      } catch (err) {
        this.#proxyConsole.off();
        console.error(err);

        const error = err as PythonError;

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
          return {
            ...this.#createErrorResponse(afterEachErr as TestError),
          };
        }

        __userGlobals.destroy();
      }
    };
  }

  async #setupPyodide() {
    // Loading pyodide is expensive, so we use the cached version if possible.
    if (this.#pyodide) return this.#pyodide;

    const pyodide = await loadPyodide({
      // TODO: host this ourselves
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${pkg.version}/full/`,
    });
    this.#pyodide = pyodide;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    pyodide.FS.writeFile(
      "/home/pyodide/ast_helpers.py",
      helpers.python.astHelpers,
      {
        encoding: "utf8",
      },
    );

    return pyodide;
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
      await this.init(e.data.value);
      respond(READY_MESSAGE);
    } else if (e.data.type === "code") {
      // This is used to run arbitrary non-test code, such as the afterAll hook.
      await this.runCode(e.data.value);
      respond({ type: "code" });
    }
  }
}

const worker = new PythonTestEvaluator();

globalThis.onmessage = function (
  e: TestEvent | InitEvent<InitWorkerOptions> | CodeEvent,
) {
  void worker.handleMessage(e);
};
