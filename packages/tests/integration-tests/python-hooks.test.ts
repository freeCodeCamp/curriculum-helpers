import "vitest-environment-puppeteer";

describe("Python hook cleanup", () => {
  beforeAll(async () => {
    await page.goto("http://localhost:8080/");
  }, 20000);

  it.each([
    "assert.equal(1, 1)",
    "",
    "await Promise.resolve()",
    "({ test: async () => {} })",
    "throw new Error('body error')",
  ])(
    "runs afterEach once for %j and includes its logs",
    async (body) => {
      const results = await page.evaluate(async (body) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          hooks: {
            beforeAll: "globalThis.hookCalls = 0",
            afterEach: "console.log('hook', ++globalThis.hookCalls)",
          },
        });
        return [await runner.runTest(body), await runner.runTest("")];
      }, body);

      expect(results[0].logs).toEqual([{ level: "log", msg: "hook 1" }]);
      expect(results[1]).toEqual({
        pass: true,
        logs: [{ level: "log", msg: "hook 2" }],
      });
    },
    20000,
  );

  it("destroys globals and preserves logs when afterEach throws", async () => {
    const results = await page.evaluate(async () => {
      const runner = await window.FCCTestRunner.createTestRunner({
        type: "python",
        hooks: {
          beforeAll: "globalThis.previousGlobals = undefined",
          beforeEach: `
            if (globalThis.previousGlobals) {
              assert.throws(() => globalThis.previousGlobals.get('__name__'), /destroyed/);
            }
            globalThis.previousGlobals = __userGlobals;
          `,
          afterEach: "console.log('cleanup'); throw new Error('hook error')",
        },
      });
      const first = await runner.runTest("console.log('body')");
      await runner.init(
        {
          hooks: {
            beforeEach:
              "assert.throws(() => globalThis.previousGlobals.get('__name__'), /destroyed/)",
          },
        },
        1000,
      );
      return [first, await runner.runTest("void 0")];
    });

    expect(results[0]).toMatchObject({
      err: { message: "hook error" },
      logs: [
        { level: "log", msg: "body" },
        { level: "log", msg: "cleanup" },
      ],
    });
    expect(results[1]).toEqual({ pass: true });
  });
});
