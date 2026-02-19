import { compileForTests } from "../../shared/tooling/webpack-compile";

describe("Worker Timeouts", () => {
  beforeAll(async () => {
    compileForTests();
    await page.goto("http://localhost:8080/");
    // It shouldn't take this long, particularly not once cached, but just to be
    // safe
  }, 20000);

  page.on("console", (msg) => {
    console.log("PAGE LOG:", msg.text());
  });

  describe("Javascript Test Runner", () => {
    it("should return an error if the test does not terminate", async () => {
      const source = `function loop() {while(true) {}; return 1};
function run() {return 1}`;

      const timeoutResult = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "javascript",
        });
        return runner.runTest("assert.equal(loop(), 1);", 100);
      }, source);

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "javascript",
        });
        return runner.runTest("assert.equal(run(), 1);", 100);
      }, source);

      expect(timeoutResult).toEqual({
        err: {
          message: "Test timed out",
        },
      });

      expect(result).toEqual({
        pass: true,
      });
    });

    it("should return an error if the source does not terminate", async () => {
      const source = `function loop() {while(true) {}; return 1};
loop();
`;

      const timeoutResult = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          source,
          type: "javascript",
          code: {
            contents: "// some code",
          },
        });
        return runner.runTest("assert.equal(1, 1);", 10);
      }, source);

      expect(timeoutResult).toEqual({
        err: {
          message: "Test timed out",
        },
      });
    });
  });
  describe("Python Test Runner", () => {
    beforeAll(async () => {
      // It's helpful to initialize the test runner ahead of time since it's
      // quite a slow process. Otherwise we have to remember to give the first
      // test a longer timeout.
      await page.evaluate(async () => {
        await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "",
          },
          source: "",
        });
      });
    });

    it("should return errors if the test does not terminate", async () => {
      const source = `
def loop():
	while True:
		pass
	return 1
def run():
	return 1
`;
      const timeoutResult = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "",
          },
          source,
        });
        const result = await runner?.runTest(
          `({
						test: () => assert.equal(runPython('loop()'), 1)
				})`,
          10,
        );
        return result;
      }, source);

      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "",
          },
          source,
        });
        return runner?.runTest(
          `({
						test: () => assert.equal(runPython('run()'), 1)
				})`,
        );
      }, source);

      expect(timeoutResult).toEqual({
        err: {
          message: "Test timed out",
        },
      });
      expect(result).toEqual({
        pass: true,
      });
    });

    it("should return errors if the source does not terminate", async () => {
      const source = `
while True:
	pass
`;
      const result = await page.evaluate(async (source) => {
        const runner = await window.FCCTestRunner.createTestRunner({
          type: "python",
          code: {
            contents: "",
          },
          source,
        });
        return runner?.runTest(
          `({
						test: () => assert.equal(runPython('1'), 1)
				})`,
          10,
        );
      }, source);

      expect(result).toEqual({
        err: {
          message: "Test timed out",
        },
      });
    });
  });
});
