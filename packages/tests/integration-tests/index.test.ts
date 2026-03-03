/* eslint-disable max-lines */
import "vitest-environment-puppeteer";
import type { FCCTestRunner } from "../../main/src/index";
import { Fail, Pass } from "../../shared/src/interfaces/test-evaluator";

declare global {
  interface Window {
    FCCTestRunner: FCCTestRunner;
  }
}

describe("Test Runner", () => {
  beforeAll(async () => {
    await page.goto("http://localhost:8080/");
    // It shouldn't take this long, particularly now that webpack is used in a
    // setup file, but just to be safe
  }, 20000);

  beforeEach(async () => {
    // Clear the page
    await page.evaluate(() => {
      document.body.innerHTML = "";
    });
  });

  it("should throw if createTestRunner times out while creating a DOM runner", async () => {
    await expect(() =>
      page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner(
          { type: "dom" },
          { timeout: 0 },
        );
      }),
    ).rejects.toThrow("Timed out waiting for the test frame to load");
  });

  it("should throw if createTestRunner times out while creating a Worker runner", async () => {
    await expect(() =>
      page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner(
          { type: "javascript" },
          { timeout: 0 },
        );
      }),
    ).rejects.toThrow("Timed out waiting for the test worker to initialize");
  });

  // Worker runners are not timing out yet, but if they start to we'll need this
  // test to help debug
  it.todo(
    "should throw if createTestRunner times out while creating a worker runner",
  );

  it("should add a FCCTestRunner to the window object", async () => {
    const sandbox = await page.evaluate(() => window.FCCTestRunner);

    expect(sandbox).toMatchObject({});
  });

  it("should be instantiated by createTestRunner", async () => {
    const before = await page.$("iframe");
    await page.evaluate(async () => {
      await window.FCCTestRunner.createTestRunner({ type: "dom" });
    });

    const after = await page.$("iframe");

    expect(before).toBeFalsy();
    expect(after).toBeTruthy();
  });

  it("should be disposable", async () => {
    await page.evaluate(async () => {
      await window.FCCTestRunner.createTestRunner({ type: "dom" });
    });

    const before = await page.$("iframe");
    await page.evaluate(() => {
      window.FCCTestRunner.getRunner("dom")?.dispose();
    });

    const after = await page.$("iframe");

    expect(before).toBeTruthy();
    expect(after).toBeFalsy();
  });

  it("should reuse old runners if createTestRunner is called multiple times", async () => {
    const sameIframe = await page.evaluate(async () => {
      const runnerOne = await window.FCCTestRunner.createTestRunner({
        type: "dom",
        code: {
          contents: "// some code",
        },
      });

      const runnerTwo = await window.FCCTestRunner.createTestRunner({
        type: "dom",
        code: {
          contents: "// some different code",
        },
      });

      return runnerOne === runnerTwo;
    });
    expect(sameIframe).toBe(true);

    const sameWorker = await page.evaluate(async () => {
      const runnerOne = await window.FCCTestRunner.createTestRunner({
        type: "javascript",
        code: {
          contents: "// some code",
        },
      });

      const runnerTwo = await window.FCCTestRunner.createTestRunner({
        type: "javascript",
        code: {
          contents: "// some different code",
        },
      });

      return runnerOne === runnerTwo;
    });
    expect(sameWorker).toBe(true);
  });

  describe.each([
    { type: "dom" },
    { type: "javascript" },
    { type: "python" },
  ] as const)("$type test evaluator", ({ type }) => {
    it("should handle tests that throw errors", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });
        return runner.runTest("throw new Error('test error')");
      }, type);

      expect(result).toEqual({
        err: {
          message: "test error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("Error: test error"),
        },
      });
    });

    it("should ignore events that are not from the test evaluator", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        const resultPromise = runner.runTest("assert.equal(1, 1)");
        window.postMessage({ type: "test" }, "*");
        return resultPromise;
      }, type);

      expect(result).toEqual({ pass: true });
    });

    it("should handle editableContents", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          code: { editableContents: "find this" },
        });

        return runner.runTest("assert.equal(editableContents, 'find this')");
      }, type);

      expect(result).toEqual({ pass: true });
    });

    it("should return any logs generated during the tests", async () => {
      const levels = ["error", "warn", "log", "info", "trace", "debug"];
      const results = await page.evaluate(
        async (type, levels) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type,
          });

          const logs: (Pass | Fail)[] = [];

          for (const level of levels) {
            logs.push(
              // eslint-disable-next-line no-await-in-loop
              await runner.runTest(`console.${level}('test ${level}')`),
            );
          }

          return logs;
        },
        type,
        levels,
      );

      const expectedResults = levels.map((level) => ({
        pass: true,
        logs: [{ level, msg: `test ${level}` }],
      }));

      expect(results).toEqual(expectedResults);
    });

    it("should handle logs with multiple arguments", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        return runner.runTest("console.log('test log', 'test log 2')");
      }, type);

      expect(result).toEqual({
        pass: true,
        logs: [
          {
            level: "log",
            msg: "test log test log 2",
          },
        ],
      });
    });

    it("should NOT return error logs generated after the test has finished", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });
        // Non-chai errors thrown in the test will be logged.
        return runner.runTest("throw new Error('test error')");
      }, type);

      expect(result).toEqual({
        err: {
          message: "test error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("Error: test error"),
        },
      });
    });

    it("should evaluate the logged value at the time it was logged", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });
        return runner.runTest(`
const arr = [];
for(let i = 0; i < 3; i++) {
  console.log(arr);
  arr.push(i);
}
`);
      }, type);

      expect(result).toEqual({
        pass: true,
        logs: [
          { level: "log", msg: "[]" },
          { level: "log", msg: "[ 0 ]" },
          { level: "log", msg: "[ 0, 1 ]" },
        ],
      });
    });

    it("should console.error non-chai errors thrown in the test", async () => {
      const spy = vi.fn();
      page.once("console", (msg) => {
        spy({ type: msg.type(), text: msg.text() });
      });
      await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });
        // Non-chai errors thrown in the test should be logged.
        return runner.runTest("throw new Error('test error')");
      }, type);

      expect(spy).toHaveBeenCalledWith({
        type: "error",
        text: "JSHandle@error",
      });
    });

    it("should handle concurrent tests", async () => {
      const results = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        const testOne = runner.runTest("assert.equal(1, 2)");
        const testTwo = runner.runTest("assert.equal(2, 3)");
        return Promise.all([testOne, testTwo]);
      }, type);

      expect(results[0]).toMatchObject({
        err: {
          actual: 1,
          expected: 2,
        },
      });
      expect(results[1]).toMatchObject({
        err: {
          actual: 2,
          expected: 3,
        },
      });
    });

    it("should handle beforeEach expressions without trailing semicolons", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            beforeEach: "let x = 1;Array()",
          },
        });
        const one = await runner.runTest("(assert.equal(x, 1))");
        return one;
      }, type);

      expect(result).toEqual({ pass: true });
    });

    it("should evaluate the beforeEach hook before each test", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            beforeEach: "globalThis.x = 1;",
          },
        });
        const one = await runner.runTest("x += 1; assert.equal(x, 2);");
        const two = await runner.runTest("x += 1; assert.equal(x, 2);");
        return [one, two];
      }, type);

      expect(result).toEqual([{ pass: true }, { pass: true }]);
    });

    it("should evaluate the beforeAll hook once before all tests", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            beforeAll: "globalThis.x = 1;",
          },
        });
        const one = await runner.runTest("x += 1; assert.equal(x, 2);");
        const two = await runner.runTest("x += 1; assert.equal(x, 3);");
        // Clean up the global variable
        await runner.runTest("delete globalThis.x;");

        return [one, two];
      }, type);

      expect(result).toEqual([{ pass: true }, { pass: true }]);
    });

    it("should evaluate the afterEach hook after each test", async () => {
      const afterEachResult = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            afterEach: "delete globalThis.x",
          },
        });

        await runner.runTest("globalThis.x = 1;");

        // Check that afterEach cleared the global variable
        const afterFirst = await runner.runTest(
          "assert.equal(globalThis.x, undefined);",
        );

        return afterFirst;
      }, type);

      expect(afterEachResult).toEqual({ pass: true });

      const afterSecondResult = await page.evaluate(async (type) => {
        const runner = window.FCCTestRunner.getRunner(type);
        await runner?.runTest("globalThis.x = 1;");

        // Check again that afterEach cleared the global variable
        return runner?.runTest("assert.equal(globalThis.x, undefined);");
      }, type);

      expect(afterSecondResult).toEqual({ pass: true });
    });

    it("should evaluate the afterEach hook even when tests fail", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            afterEach: "delete globalThis.x",
          },
        });

        // Run a failing test
        await runner.runTest("globalThis.x = 1; assert.equal(1, 2);");

        // Check that afterEach still ran
        const afterFailed = await runner.runTest(
          "assert.equal(globalThis.x, undefined);",
        );

        return afterFailed;
      }, type);

      expect(result).toEqual({ pass: true });
    });

    it("should handle running multiple tests with runAllTests", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        const tests = [
          "assert.equal(1, 1)",
          "assert.equal(2, 2)",
          "assert.equal(1, 2)", // This should fail
          "console.log('test message'); assert.equal(3, 3)",
        ];

        return runner.runAllTests(tests);
      }, type);

      expect(result).toEqual([
        { pass: true },
        { pass: true },
        {
          err: {
            actual: 1,
            expected: 2,
            message: "expected 1 to equal 2",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stack: expect.stringMatching(
              "AssertionError: expected 1 to equal 2",
            ),
          },
        },
        {
          pass: true,
          logs: [
            {
              level: "log",
              msg: "test message",
            },
          ],
        },
      ]);
    });

    it("should be able to handle empty arrays passed to runAllTests", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        return runner.runAllTests([]);
      }, type);

      expect(result).toEqual([]);
    });

    it("should run the afterAll hook after running all tests", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            beforeAll: "globalThis.x = 0;",
            afterAll: "globalThis.x = 1;",
          },
        });

        // Individual tests do not trigger the afterAll hook, but runAllTests
        // does.
        const initial = await runner.runAllTests(["assert.equal(x, 0);"]);

        // Check that afterAll ran
        const after = await runner.runTest("assert.equal(x, 1);");

        return [initial, after];
      }, type);

      expect(result).toEqual([[{ pass: true }], { pass: true }]);
    });

    it("should run the afterAll hook even if a test fails", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            beforeAll: "globalThis.x = 0;",
            afterAll: "globalThis.x = 1;",
          },
        });

        // Run a failing test
        await runner.runAllTests([
          "assert.equal(x, 0);",
          "assert.equal(1, 2);", // This should fail
        ]);

        // Check that afterAll ran
        return runner.runTest("assert.equal(x, 1);");
      }, type);

      expect(result).toEqual({ pass: true });
    });

    it("should console.error the error if the afterAll hook fails", async () => {
      expect.assertions(2);
      page.once("console", (msg) => {
        expect(msg.type()).toBe("error");
      });

      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            afterAll: "throw new Error('afterAll error');",
          },
        });

        return runner.runAllTests(["assert.equal(1, 1);"]);
      }, type);

      expect(result).toEqual([{ pass: true }]);
    });

    it("should support top-level await in tests", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        return runner.runTest(`
          const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          await delay(10);
          assert.equal(1, 2);`);
      }, type);
      expect(result).toMatchObject({ err: { actual: 1 } });
    });

    it("should not await tests that return promises", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
        });

        return runner.runTest(`
new Promise((resolve) => {
  setTimeout(() => {
    console.log("This should not be awaited");
    resolve();
  }, 10);
});
`);
      }, type);
      // No logs should be returned, as the test should not be awaited
      expect(result).toEqual({ pass: true });
    });

    it("should fail the test if the afterEach hook throws an error", async () => {
      const result = await page.evaluate(async (type) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type,
          hooks: {
            afterEach: "throw new Error('afterEach error')",
          },
        });

        return runner.runTest("");
      }, type);

      expect(result).toEqual({
        err: {
          message: "afterEach error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching("Error: afterEach error"),
        },
      });
    });

    it("should be possible to mock fetch in tests", async () => {
      const beforeAll = `
globalThis.originalFetch = globalThis.fetch;
globalThis.fetch = () => Promise.resolve( { json: () => Promise.resolve({ message: 'Mocked fetch!' }) } );
    `;

      const afterAll = `
globalThis.fetch = originalFetch;
    `;

      const result = await page.evaluate(
        async (type, beforeAll, afterAll) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type,
            hooks: {
              beforeAll,
              afterAll,
            },
          });
          return runner.runAllTests([
            `
const response = await fetch('https://any.url');
const data = await response.json();
assert.deepEqual(data, { message: 'Mocked fetch!' });
`,
          ]);
        },
        type,
        beforeAll,
        afterAll,
      );

      expect(result).toEqual([{ pass: true }]);
    });

    it("should be possible to mock fetch in the beforeEach hook", async () => {
      const beforeEach = `
globalThis.originalFetch = globalThis.fetch;
globalThis.fetch = () => Promise.resolve( { json: () => Promise.resolve({ message: 'Mocked fetch in beforeEach!' }) } );
    `;

      const afterEach = `
globalThis.fetch = originalFetch;
    `;

      const result = await page.evaluate(
        async (type, beforeEach, afterEach) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type,
            hooks: {
              beforeEach,
              afterEach,
            },
          });
          return runner.runAllTests([
            `
const response = await fetch('https://any.url');
const data = await response.json();
assert.deepEqual(data, { message: 'Mocked fetch in beforeEach!' });
`,
          ]);
        },
        type,
        beforeEach,
        afterEach,
      );

      expect(result).toEqual([{ pass: true }]);
    });

    it("should make fetch requests from the browsing context of the test runner", async () => {
      const result = await page.evaluate(async (type) => {
        // Create spy
        const originalFetch = window.fetch;
        let fetchCallArgs: unknown[];
        window.fetch = ((...args: [unknown]) => {
          fetchCallArgs = args;
          return Promise.resolve(
            new Response('{"message": "Hello, world!"}', {
              status: 200,
              statusText: "OK",
              headers: { "Content-Type": "application/json" },
            }),
          );
        }) as typeof fetch;

        try {
          const runner = await window.FCCTestRunner.createTestRunner({
            type,
          });

          await runner.runTest(
            `const response = await fetch('https://doesnot.exist', { method: 'GET' });
          const data = await response.json();
          assert.deepEqual(data, { message: 'Hello, world!' });
          assert.equal(response.status, 200);
          assert.equal(response.statusText, 'OK');
          assert.equal(response.url, 'https://doesnot.exist');
          assert.equal(response.ok, true);`,
          );

          return {
            fetchCallArgs,
          };
        } finally {
          // Restore original fetch
          window.fetch = originalFetch;
        }
      }, type);

      expect(result.fetchCallArgs).toEqual([
        "https://doesnot.exist",
        { method: "GET", credentials: "omit" },
      ]);
    });

    it("should always omit credentials in fetch requests", async () => {
      const result = await page.evaluate(async (type) => {
        // Create spy
        const originalFetch = window.fetch;
        let fetchCallArgs: unknown[];
        try {
          window.fetch = ((...args: [unknown]) => {
            fetchCallArgs = args;
            return Promise.resolve(
              new Response('{"message": "Hello, world!"}', {
                status: 200,
                statusText: "OK",
                headers: { "Content-Type": "application/json" },
              }),
            );
          }) as typeof fetch;

          const runner = await window.FCCTestRunner.createTestRunner({
            type,
          });

          await runner.runTest(
            `await fetch('https://doesnot.exist', { method: 'GET', credentials: 'include' });`,
          );
          return fetchCallArgs;
        } finally {
          // Restore original fetch
          window.fetch = originalFetch;
        }
      }, type);

      expect(result).toEqual([
        "https://doesnot.exist",
        { method: "GET", credentials: "omit" },
      ]);
    });

    it("should expose the Explorer class in the test environment", async () => {
      const source = `const x = "test";`;

      const result = await page.evaluate(
        async (source, type) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type, // TODO: test all runner types
            source,
            code: {
              contents: source,
            },
          });
          return runner.runTest(`
const explorer = await __helpers.Explorer(code);
const vars = explorer.getVariables();

assert.exists(vars.x);
assert.isUndefined(vars.y);
`);
        },
        source,
        type,
      );

      expect(result).toEqual({ pass: true });
    });
  });

  describe.each([
    { type: "dom" },
    // FakeTimers to come later
    // {
    //   type: "javascript",
    // },
  ] as const)("FakeTimers for $type test evaluator", ({ type }) => {
    it("should be available in tests", async () => {
      const beforeAll = `const clock = __FakeTimers.install();`;

      const result = await page.evaluate(
        async (type, beforeAll) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type,
            hooks: {
              beforeAll,
            },
          });
          return runner.runTest(`
assert.equal(clock.now, 0);
clock.tick(1000);
assert.equal(clock.now, 1000);
`);
        },
        type,
        beforeAll,
      );
      expect(result).toEqual({ pass: true });
    });

    it("should be possible to unmock the timers", async () => {
      const beforeAll = `let clock = __FakeTimers.install();`;

      const result = await page.evaluate(
        async (type, beforeAll) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type,
            hooks: {
              beforeAll,
            },
          });
          const testOne = await runner.runTest(`
try {
clock.tick(1000);
assert.equal(clock.now, 1000);
} finally {
  clock.uninstall();
}
`);

          const testTwo = await runner.runTest(
            `assert.notEqual(Date.now(), 1000);`,
          );
          return [testOne, testTwo];
        },
        type,
        beforeAll,
      );
      expect(result).toEqual([{ pass: true }, { pass: true }]);
    });

    it("should quickly resolve runAll", async () => {
      const source = `<script>
const countDown = () => {
	let count = 0;
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			count++;
			if (count === 50) {
				clearInterval(interval);
				resolve(count);
			}
		}, 1000);
	});
}</script>
`;

      const beforeAll = `let clock = __FakeTimers.install();`;

      const result = await page.evaluate(
        async (type, source, beforeAll) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            source,
            type,
            hooks: {
              beforeAll,
            },
          });
          // If the timers weren't mocked this would take 50 seconds and the
          // test would timeout
          const result = await runner.runTest(`async() => {
	const count = countDown();
	clock.runAll();
	assert.equal(await count, 50);
}
`);

          return result;
        },
        type,
        source,
        beforeAll,
      );
      expect(result).toEqual({ pass: true });
    });

    it("should have access to assert in the beforeAll function", async () => {
      const source = `<script>
const getFive = () => 5;
</script>`;
      const beforeAll = `const fn = () => assert.equal(getFive(), 5);`;
      const result = await page.evaluate(
        async (type, source, beforeAll) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            source,
            type,
            hooks: {
              beforeAll,
            },
          });
          return runner.runTest("fn()");
        },
        type,
        source,
        beforeAll,
      );
      expect(result).toEqual({ pass: true });
    });
  });

  describe("DOM evaluator", () => {
    afterAll(async () => {
      await page.evaluate(() => {
        window.FCCTestRunner.getRunner("dom")?.dispose();
      });
    });
    it("should create a sandboxed iframe", async () => {
      await page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner({ type: "dom" });
      });

      const iframe = await page.$("iframe");
      const sandbox = await iframe?.evaluate((iframe) =>
        iframe.getAttribute("sandbox"),
      );

      expect(sandbox).toBe("allow-scripts allow-forms");
    });

    it("should hide the iframe from the user", async () => {
      await page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner({ type: "dom" });
      });

      const iframe = await page.$("iframe");
      const style = await iframe?.evaluate((iframe) => {
        const style = window.getComputedStyle(iframe);
        return {
          left: style.left,
          top: style.top,
          visibility: style.visibility,
          position: style.position,
        };
      });

      expect(style).toEqual({
        left: "-9999px",
        top: "-9999px",
        visibility: "hidden",
        position: "absolute",
      });
    });

    it("should use a different approach to hide the iframe when using allowAnimations", async () => {
      await page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner({
          type: "dom",
          allowAnimations: true,
        });
      });

      const iframe = await page.$("iframe");
      const style = await iframe?.evaluate((iframe) => {
        const style = window.getComputedStyle(iframe);
        return {
          width: style.width,
          height: style.height,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          visbility: style.visibility,
        };
      });

      expect(style).toEqual({
        width: "0px",
        height: "0px",
        opacity: "0",
        pointerEvents: "none",
        visbility: "visible", // This confirms that the default style has been reverted
      });
    });

    it("should layout the iframe correctly", async () => {
      const source = `<body>
				indented text
</body>`;

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });

        return runner.runTest(
          `assert.equal(document.querySelector('body').innerText, 'indented text')`,
        );
      }, source);

      expect(result).toEqual({
        pass: true,
      });
    });

    it("should ignore messages that do not come from the parent window", async () => {
      try {
        const result = await page.evaluate(async () => {
          await window.FCCTestRunner.createTestRunner({ type: "dom" });

          const otherFrame = document.createElement("iframe");
          // Post a message from a different window
          otherFrame.srcdoc = `<script>let frame = window.parent.document.getElementById('test-frame').contentWindow.postMessage({ type: "test", value: "document.body.innerHTML.includes('<h1>Hello World</h1>')" }, "*");
						 </script>`;

          // Wait for a message from otherFrame
          const awaitMessage = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done"), 100);
            window.addEventListener("message", () =>
              reject(Error("Should not have received a message")),
            );
          });
          document.body.appendChild(otherFrame);

          return awaitMessage;
        });

        expect(result).toBe("done");
      } finally {
        // Clear all iframes
        await page.evaluate(() => {
          const iframes = document.querySelectorAll("iframe");
          iframes.forEach((iframe) => {
            iframe.remove();
          });
        });
      }
    });

    it("should run tests against the sandboxed iframe", async () => {
      const source = "<body><h1>Hello World</h1></body>";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });
        return runner.runTest(
          "assert.include(document.body.innerHTML,`<h1>Hello World</h1>`)",
        );
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should have access to variables defined in the iframe", async () => {
      const source =
        "<body><h1>Hello World</h1><script>const someGlobal = 'test'</script></body>";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });
        return runner.runTest("assert.equal(someGlobal, 'tes')");
      }, source);

      expect(result).toEqual({
        err: {
          actual: "test",
          expected: "tes",
          message: "expected 'test' to equal 'tes'",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching(
            "AssertionError: expected 'test' to equal 'tes'",
          ),
        },
      });
    });

    it("should have access to the original code when running tests", async () => {
      const source = "";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          code: {
            contents: "// some code",
          },
        });
        return runner.runTest("assert.equal(code, '// some code');");
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should run source scripts before running tests", async () => {
      const source = "<script>const getFive = () => 5;</script>";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          code: {
            contents: "// some code",
          },
        });
        return runner.runTest("assert.equal(5, getFive());");
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should handle unclosed tags in the source", async () => {
      const source = `<script> const getFive = () => 5; </script>;
<script> const getSix = () => 6`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          code: {
            contents: "// some code",
          },
        });
        return runner.runTest("assert.equal(5, getFive());");
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should serialize error responses", async () => {
      const results = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "dom",
        });
        const resultOne = await runner.runTest(
          "assert.isNotEmpty(document.querySelectorAll('h1'))",
        );
        const resultTwo = await runner.runTest(
          "assert.notEqual(Symbol('foo'), 'something')",
        );
        return [resultOne, resultTwo];
      });

      expect(results[0]).toEqual({
        err: {
          actual: "NodeList []",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching(
            // Yes, there's a discrepancy between the error message and the
            // actual value, but at the moment we don't use the stack in the
            // client.
            "AssertionError: expected  not to be empty",
          ),
          message: "expected  not to be empty",
        },
      });
      expect(results[1]).toEqual({
        pass: true,
      });
    });

    it("should allow tests to play audio", async () => {
      const source = `<body><audio id='audio' src='nothing.mp3'></audio></body>`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });
        return runner.runTest("await document.getElementById('audio').play()");
      }, source);

      // If it were unable to play, it would throw "play() failed because the
      // user didn't interact with the document first". The following errors
      // only happen because it does try to play. There are two possible
      // errors I think because it depends if the audio file has been loaded
      // or not.
      expect(result).toEqual({
        err: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          message: expect.stringMatching(
            /The element has no supported sources.|Failed to load because no supported source was found./,
          ),
        },
      });
    });

    it("should allow tests to access local storage", async () => {
      const source = `<body><h1>Hello World</h1></body>`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });
        return runner.runTest(
          "localStorage.setItem('test', 'value'); assert.equal(localStorage.getItem('test'), 'value');",
        );
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should allow form submission", async () => {
      const source = `<script>
var clicked = false;
const onSubmit = () => {
  clicked = true
}

	</script>
<form id="form" onsubmit="onSubmit()"><button type='submit'></button></form>`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });
        return runner.runTest(
          `const submitBtn = document.querySelector("button[type='submit']");
submitBtn.click();
assert.equal(clicked, true);`,
        );
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should be able to use Enzyme in tests", async () => {
      const source = `<script src='https://cdnjs.cloudflare.com/ajax/libs/react/16.4.0/umd/react.production.min.js' type='text/javascript'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.4.0/umd/react-dom.production.min.js' type='text/javascript'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.4.0/umd/react-dom-test-utils.production.min.js' type='text/javascript'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.4.0/umd/react-dom-server.browser.production.min.js' type='text/javascript'></script></head><body><div id='root'></div><div id='challenge-node'></div><script>"use strict";"use strict";

var JSX = /*#__PURE__*/React.createElement("h1", null, "Hello JSX!");"use strict";

ReactDOM.render(JSX, document.getElementById('root'));</script></body>`;

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          loadEnzyme: true,
        });
        return runner.runTest(
          "assert(Enzyme.shallow(JSX).contains('Hello JSX!'));",
        );
      }, source);
      expect(result).toEqual({ pass: true });
    });

    it("should be able to use Enzyme.mount in tests", async () => {
      const source = `<script src='https://cdnjs.cloudflare.com/ajax/libs/react/16.4.0/umd/react.production.min.js' type='text/javascript'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.4.0/umd/react-dom.production.min.js' type='text/javascript'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.4.0/umd/react-dom-test-utils.production.min.js' type='text/javascript'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.4.0/umd/react-dom-server.browser.production.min.js' type='text/javascript'></script>`;

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          loadEnzyme: true,
        });
        return runner.runTest(
          `
const elem = React.createElement(
  'h1',
  { className: 'greeting' },
  'Hello'
);
const mocked = Enzyme.mount(elem);
assert(mocked.find('.greeting').length === 1);
`,
        );
      }, source);
      expect(result).toEqual({ pass: true });
    });

    it("should remove the test evaluator script after it has been evaluated", async () => {
      const source = `<script></script>`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          code: {
            contents: source,
          },
        });

        // If the test evaluator script is still in the DOM the querySelectorAll
        // will find two scripts
        return runner.runTest(
          "assert.equal(document.querySelectorAll('script').length, 1);",
        );
      }, source);

      expect(result).toEqual({
        pass: true,
      });
    });

    it("should remove the hooks script after it has been evaluated", async () => {
      const source = `<script></script>`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          code: {
            contents: source,
          },
          hooks: {
            beforeAll: "window.__before = 'and so it begins'",
          },
        });

        // If the test evaluator script is still in the DOM the querySelectorAll
        // will find two scripts
        return runner.runTest(
          "assert.equal(document.querySelectorAll('script').length, 1);",
        );
      }, source);

      expect(result).toEqual({
        pass: true,
      });
    });

    it.each([{ method: "prompt" }, { method: "alert" }, { method: "confirm" }])(
      "should handle calls to window.$method",
      async ({ method }) => {
        const consoleSpy = vi.fn();

        page.once("console", (msg) => {
          consoleSpy(msg.text());
        });

        const result = await page.evaluate(async (method) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type: "dom",
          });
          return runner.runTest(`window.${method}('test ${method}')`);
        }, method);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Ignored call to '${method}()'. The document is sandboxed, and the 'allow-modals' keyword is not set.`,
        );

        expect(result).toEqual({
          pass: true,
        });
      },
    );

    it("should prevent forms from triggering navigation", async () => {
      const source = `<!DOCTYPE html>
        <form>
        <button id="check-btn">Check</button>
        </form>
  `;

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
        });

        await runner.runTest(`
const checkBtn = document.getElementById('check-btn');
checkBtn.click();`);

        // Small delay to allow the page to navigate (if it does)
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });

        return runner.runTest(`
const checkBtn = document.getElementById('check-btn');
checkBtn.click();
       `);
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should make __helpers available in before hooks", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "dom",
          hooks: {
            beforeEach:
              "const before = __helpers.removeJSComments('before // this')",
            beforeAll:
              "const beforeall = __helpers.removeJSComments('before all // this')",
          },
        });

        return runner.runAllTests([
          "assert.equal(before, 'before ')",
          "assert.equal(beforeall, 'before all ')",
        ]);
      });

      expect(result).toEqual([{ pass: true }, { pass: true }]);
    });

    it("should be possible to test CSS transitions", async () => {
      const source = `<style>
      #box {
        width: 100px;
        transition: width 0.1s;
      }
      #box.expanded {
        width: 200px;
      }
    </style>
    <div id="box"></div>`;

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "dom",
          allowAnimations: true,
        });

        return runner.runTest(`
        const box = document.getElementById('box');
        box.classList.add('expanded');

        // Wait for the transition to complete
        await new Promise((resolve) => {
          box.addEventListener('transitionend', resolve, { once: true });
        });

        const computedStyle = window.getComputedStyle(box);
        assert.equal(computedStyle.width, '200px');
      `);
      }, source);

      expect(result).toEqual({ pass: true });
    });
  });

  describe("Javascript evaluator", () => {
    it("should not create a frame", async () => {
      await page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner({
          type: "javascript",
        });
      });

      const frame = await page.$("iframe");

      expect(frame).toBeFalsy();
    });

    it("should run tests after evaluating the source supplied to the runner", async () => {
      const source = "const getFive = () => 5;";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "javascript",
          code: {
            contents: "// should not be evaluated",
          },
        });
        return runner.runTest(
          "if(getFive() !== 5) { throw Error('getFive() should return 5') }",
        );
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should have access to the original code when running tests", async () => {
      const source = "const getFive = () => 5;";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "javascript",
          code: {
            contents: "// some code",
          },
        });
        return runner.runTest("assert.equal(code, '// some code');");
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should stringify expected and actual values before returning them to the caller", async () => {
      const source = "const symb = Symbol.for('foo');";
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "javascript",
          code: {
            contents: "// some code",
          },
        });
        return runner.runTest(
          "assert.equal(Symbol.for('foo'), Symbol.for('bar'))",
        );
      }, source);
      expect(result).toEqual({
        err: {
          actual: "Symbol(foo)",
          expected: "Symbol(bar)",
          message: "expected Symbol(foo) to equal Symbol(bar)",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching(
            /AssertionError: expected Symbol\(foo\) to equal Symbol\(bar\)/,
          ),
        },
      });
    });

    it("should make __helpers available in before hooks", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "javascript",
          hooks: {
            beforeEach:
              "const before = __helpers.removeJSComments('before // this')",
            beforeAll:
              "globalThis.beforeall = __helpers.removeJSComments('before all // this')",
          },
        });

        return runner.runAllTests([
          "assert.equal(before, 'before ')",
          "assert.equal(globalThis.beforeall, 'before all ')",
        ]);
      });

      expect(result).toEqual([{ pass: true }, { pass: true }]);
    });

    // Weird edge case, but if the user code starts with an opening bracket and
    // the beforeEach hook does not end with a semicolon, the combination of the
    // two could be interpreted as a function call. In this case
    // Array()( { key: 'value' }) )
    // and that's a TypeError.
    it("should handle user code with leading brackets", async () => {
      const source = `({ key: 'value' })`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          code: { contents: source },
          type: "javascript",
          hooks: {
            beforeEach: "Array()",
          },
        });
        return runner.runTest("(assert.equal(code, '({ key: \\'value\\' })'))");
      }, source);

      expect(result).toEqual({ pass: true });
    });
  });

  describe("Python evaluator", () => {
    it("should run tests after evaluating the source supplied to the runner", async () => {
      const source = `def get_five():
  return 5`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          source,
        });
        return runner?.runTest(
          `({
test: () => assert.equal(runPython('get_five()'), 5),
						})`,
        );
      }, source);

      expect(result).toEqual({ pass: true });
    });

    it("should clear the source when init is called a second time", async () => {
      const source = `def get_five():
  return 5`;
      await page.evaluate(async (source) => {
        await window.FCCTestRunner.createTestRunner({
          type: "python",
          source,
        });
      }, source);

      const result = await page.evaluate(async () => {
        const runner = window.FCCTestRunner.getRunner("python");
        await runner?.init({}, 1000);
        return runner?.runTest(
          `({
test: () => assert.equal(runPython('get_five()'), 5),
						})`,
        );
      });

      expect(result).toMatchObject({
        err: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          message: expect.stringContaining(
            "NameError: name 'get_five' is not defined",
          ),
        },
      });
    });

    it("should set __name__ to __main__ when running tests", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
        });
        return runner?.runTest(
          `({
test: () => assert.equal(runPython('__name__'), '__main__'),
						})`,
        );
      });

      expect(result).toEqual({ pass: true });
    });

    it("should handle js-only tests", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "# wrong comment for test",
          },
        });
        return runner?.runTest(`assert.equal(code, "# comment for test")`);
      });
      expect(result).toEqual({
        err: {
          actual: "# wrong comment for test",
          expected: "# comment for test",
          message:
            "expected '# wrong comment for test' to equal '# comment for test'",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringMatching(
            "AssertionError: expected '# wrong comment for test' to equal '# comment for test'",
          ),
        },
      });
    });

    it("should reject testStrings that evaluate to an invalid object", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
        });
        return runner?.runTest(`({ invalid: 'test' })`);
      });

      expect(result).toEqual({
        err: {
          message:
            "Test string did not evaluate to an object with the 'test' property",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringContaining(
            "Error: Test string did not evaluate to an object with the 'test' property",
          ),
        },
      });
    });

    it("should make user code available to the python code as the _code variable", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "test = 'value'",
          },
        });

        return runner?.runTest(`({
  test: () => assert.equal(runPython('_code'), "test = 'value'")
})`);
      });

      expect(result).toEqual({ pass: true });
    });

    it("should make the AST helper available to the python code as _Node", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
        });
        return runner?.runTest(`({
  test: () => assert.equal(runPython('_Node("x = 1").get_variable("x")'), 1)
})`);
      });

      expect(result).toEqual({ pass: true });
    });

    it("should have access to _code in the beforeEach hook", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "test = 'value'",
          },
          hooks: {
            beforeEach: "assert.equal(runPython('_code'), \"test = 'value'\")",
          },
        });

        return runner?.runTest(`({
  test: () => {}
})`);
      });

      expect(result).toEqual({ pass: true });
    });

    it("should have access to runPython in the beforeEach hook", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          hooks: {
            beforeEach: "assert.equal(runPython('1 + 1'), 2)",
          },
        });

        return runner?.runTest("");
      });

      expect(result).toEqual({ pass: true });
    });

    it("should return error types if the python code raises an exception", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
        });
        return runner?.runTest(`({
	test: () => assert.equal(runPython('1 + "1"'), 2)
})`);
      });
      expect(result).toEqual({
        err: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          message: expect.stringContaining(
            "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
          ),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringContaining(
            "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
          ),
          type: "TypeError",
        },
      });
    });

    it("should stringify python objects before returning them to the caller", async () => {
      const source = `import re
pattern = re.compile('l+')
`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          source,
        });
        return runner?.runTest(`({
	test: () => assert.equal(runPython('str(pattern)'), "l+")
})`);
      }, source);
      expect(result).toEqual({
        err: {
          actual: "re.compile('l+')",
          expected: "l+",
          message: "expected 're.compile(\\'l+\\')' to equal 'l+'",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringContaining(
            "AssertionError: expected 're.compile(\\'l+\\')' to equal 'l+'",
          ),
        },
      });
    });

    it("should handle DataCloneErrors", async () => {
      const source = `
import re

pattern = re.compile('l+')`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          source,
        });
        // Since the comparison includes a PyProxy object, that will be
        // posted back to the caller and cause a DataCloneError
        return runner?.runTest(`
  ({ test: () => assert.equal(__userGlobals.get("pattern"), "l+") })
`);
      }, source);

      expect(result).toEqual({
        err: {
          actual: "re.compile('l+')",
          expected: "l+",
          // Yes, the message doesn't match the "actual" value, it's not
          // ideal, but we only use message and stack for debugging.

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          message: expect.stringContaining("expected PyProxy"),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          stack: expect.stringContaining("AssertionError: expected PyProxy"),
        },
      });
    });

    it("should not throw io exceptions when input is called in a test", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
        });
        return runner?.runTest(
          `({ test: () => assert.equal(runPython('input("test")'), "") })`,
        );
      });

      expect(result).toEqual({ pass: true });
    });

    it("should supporting input mocking", async () => {
      const beforeEach = `runPython('input = lambda: "test input"')`;
      const result = await page.evaluate(async (beforeEach) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          hooks: {
            beforeEach,
          },
        });
        return runner?.runTest(
          `({ test: () => assert.equal(runPython('input()'), "test input") })`,
        );
      }, beforeEach);

      expect(result).toEqual({ pass: true });
    });

    it("should support input mocking in user code", async () => {
      const source = `name = input()`;
      const beforeEach = `runPython('input = lambda: "mocked input"')`;
      const result = await page.evaluate(
        async (source, beforeEach) => {
          const runner = await window.FCCTestRunner.createTestRunner({
            type: "python",
            source,
            hooks: {
              beforeEach,
            },
          });
          return runner?.runTest(
            `({ test: () => assert.equal(runPython('name'), "mocked input") })`,
          );
        },
        source,
        beforeEach,
      );

      expect(result).toEqual({ pass: true });
    });

    it("should make __helpers available in before hooks", async () => {
      const result = await page.evaluate(async () => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          hooks: {
            beforeEach:
              "const before = __helpers.removeJSComments('before // this'); await ''",
            beforeAll:
              "globalThis.beforeall = __helpers.removeJSComments('before all // this')",
          },
        });

        return runner.runAllTests([
          "assert.equal(before, 'before ')",
          "({test: () => { assert.equal(before, 'before ')}})",
          "assert.equal(globalThis.beforeall, 'before all ')",
        ]);
      });

      expect(result).toEqual([{ pass: true }, { pass: true }, { pass: true }]);
    });
  });
});
