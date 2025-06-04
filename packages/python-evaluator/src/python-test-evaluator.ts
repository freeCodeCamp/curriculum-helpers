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
} from "../../shared/src/interfaces/test-evaluator";
import { ReadyEvent } from "../../shared/src/interfaces/test-runner";
import { postCloneableMessage } from "../../shared/src/messages";
import { format } from "../../shared/src/format";
import { ProxyConsole, createLogFlusher } from "../../shared/src/proxy-console";

type EvaluatedTeststring = {
  input?: string[];
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
  #flushLogs: ReturnType<typeof createLogFlusher>;

  constructor(proxyConsole: ProxyConsole = new ProxyConsole(self.console)) {
    this.#proxyConsole = proxyConsole;
    this.#flushLogs = createLogFlusher(this.#proxyConsole, format);
  }

  async init(opts: InitWorkerOptions) {
    const pyodide = await this.#setupPyodide();
    this.#runTest = async (testString): Promise<Pass | Fail> => {
      this.#proxyConsole.on();
      const code = (opts.code?.contents ?? "").slice();
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const editableContents = (opts.code?.editableContents ?? "").slice();

      const { assert } = chai;
      const __helpers = helpers;

      // Create fresh globals for each test
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const __userGlobals = pyodide.globals.get("dict")() as PyProxy;

      /* eslint-enable @typescript-eslint/no-unused-vars */

      try {
        // Eval test string to get the dummy input and actual test
        const evaluatedTestString = await new Promise<unknown>(
          (resolve, reject) => {
            try {
              const test: unknown = eval(testString);
              resolve(test);
            } catch (err) {
              reject(err as Error);
            }
          },
        );

        // If the test string does not evaluate to an object, then we assume that
        // it's a standard JS test and any assertions have already passed.
        if (typeof evaluatedTestString !== "object") {
          return { pass: true, ...this.#flushLogs() };
        }

        if (!evaluatedTestString || !("test" in evaluatedTestString)) {
          throw Error(
            "Test string did not evaluate to an object with the 'test' property",
          );
        }

        const { input, test } = evaluatedTestString as EvaluatedTeststring;

        // Some tests rely on __name__ being set to __main__ and we new dicts do not
        // have this set by default.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        __userGlobals.set("__name__", "__main__");

        // The runPython helper is a shortcut for running python code with our
        // custom globals.
        const runPython = (pyCode: string) =>
          pyodide.runPython(pyCode, { globals: __userGlobals }) as unknown;

        runPython(`
		def __inputGen(xs):
			def gen():
				for x in xs:
					yield x
			iter = gen()
			def input(arg=None):
				return next(iter)

			return input

		input = __inputGen(${JSON.stringify(input ?? [])})
		`);

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

        // Evaluates the learner's code so that any variables they define are
        // available to the test.
        runPython(opts.source ?? "");

        await test();

        return { pass: true, ...this.#flushLogs() };
      } catch (err) {
        this.#proxyConsole.off();
        console.error(err);
        const error = err as PythonError;

        const expected = serialize((err as { expected: unknown }).expected);
        const actual = serialize((err as { actual: unknown }).actual);

        // To provide useful debugging information when debugging the tests, we
        // have to extract the message, stack and, if they exist, expected and
        // actual before returning
        return {
          err: {
            message: error.message,
            stack: error.stack,
            ...(!!expected && { expected }),
            ...(!!actual && { actual }),
            type: error.type,
          },
          ...this.#flushLogs(),
        };
      } finally {
        this.#proxyConsole.off();
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

    // We freeze this to prevent learners from getting the worker into a
    // weird state. NOTE: this has to come after pyodide is loaded, because
    // pyodide modifies self while loading.
    Object.freeze(self);

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

  async handleMessage(
    e: TestEvent | InitEvent<InitWorkerOptions>,
  ): Promise<void> {
    if (e.data.type === "test") {
      const result = await this.#runTest!(e.data.value);
      const msg = { type: "result" as const, value: result };
      postCloneableMessage((msg) => e.ports[0].postMessage(msg), msg);
    } else if (e.data.type === "init") {
      await this.init(e.data.value);
      postMessage(READY_MESSAGE);
    }
  }
}

const worker = new PythonTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions>) {
  void worker.handleMessage(e);
};
