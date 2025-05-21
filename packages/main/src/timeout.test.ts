describe("Worker Timeouts", () => {
	describe("Test Runner", () => {
		beforeAll(async () => {
			await page.goto("http://localhost:8080/");
		});
		describe("Javascript", () => {
			it("should return an error if the test does not terminate", async () => {
				const source = `function loop() {while(true) {}; return 1};
function run() {return 1}`;

				const timeoutResult = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "javascript",
						code: {
							contents: "// some code",
						},
					});
					return runner.runTest("assert.equal(loop(), 1);", 100);
				}, source);

				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.getRunner("javascript");
					return runner?.runTest("assert.equal(run(), 1);", 100);
				});

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
					const runner = await window.FCCSandbox.createTestRunner({
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
		describe("Python", () => {
			beforeAll(async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
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

				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.getRunner("python");
					return runner?.runTest(
						`({
						test: () => assert.equal(runPython('run()'), 1)
				})`,
					);
				});

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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
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
});
