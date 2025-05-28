import "jest-puppeteer";
import "expect-puppeteer";

describe("Test Runner", () => {
	beforeAll(async () => {
		await page.goto("http://localhost:8080/");
	});
	it("should add a FCCSandbox to the window object", async () => {
		const sandbox = await page.evaluate(() => {
			return window.FCCSandbox;
		});

		expect(sandbox).toMatchObject({});
	});

	describe("FCCSandbox", () => {
		describe("TestRunner", () => {
			beforeEach(async () => {
				// clear the page
				await page.evaluate(() => {
					document.body.innerHTML = "";
				});
			});

			it("should be instantiated by createTestRunner", async () => {
				const before = await page.$("iframe");
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ type: "dom" });
				});

				const after = await page.$("iframe");

				expect(before).toBeFalsy();
				expect(after).toBeTruthy();
			});

			it("should be disposable", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ type: "dom" });
				});

				const before = await page.$("iframe");
				await page.evaluate(() => {
					window.FCCSandbox.getRunner("dom")?.dispose();
				});

				const after = await page.$("iframe");

				expect(before).toBeTruthy();
				expect(after).toBeFalsy();
			});

			it("should reuse old runners if createTestRunner is called multiple times", async () => {
				const sameIframe = await page.evaluate(async () => {
					const runnerOne = await window.FCCSandbox.createTestRunner({
						type: "dom",
						code: {
							contents: "// some code",
						},
					});

					const runnerTwo = await window.FCCSandbox.createTestRunner({
						type: "dom",
						code: {
							contents: "// some different code",
						},
					});

					return runnerOne === runnerTwo;
				});
				expect(sameIframe).toBe(true);

				const sameWorker = await page.evaluate(async () => {
					const runnerOne = await window.FCCSandbox.createTestRunner({
						type: "javascript",
						code: {
							contents: "// some code",
						},
					});

					const runnerTwo = await window.FCCSandbox.createTestRunner({
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
						const runner = await window.FCCSandbox.createTestRunner({
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
						const runner = await window.FCCSandbox.createTestRunner({ type });

						const resultPromise = runner.runTest("assert.equal(1, 1)");
						window.postMessage({ type: "test" }, "*");
						return resultPromise;
					}, type);

					expect(result).toEqual({ pass: true });
				});

				it("should handle editableContents", async () => {
					const result = await page.evaluate(async (type) => {
						const runner = await window.FCCSandbox.createTestRunner({
							type,
							code: { editableContents: "find this" },
						});

						return runner.runTest(
							"assert.equal(editableContents, 'find this')",
						);
					}, type);

					expect(result).toEqual({ pass: true });
				});

				it("should return any logs generated during the tests", async () => {
					const levels = ["error", "warn", "log", "info", "trace", "debug"];
					const results = await page.evaluate(
						async (type, levels) => {
							const runner = await window.FCCSandbox.createTestRunner({
								type,
							});

							const logs = [];

							for (const level of levels) {
								logs.push(
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
						const runner = await window.FCCSandbox.createTestRunner({
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
						const runner = await window.FCCSandbox.createTestRunner({
							type,
						});
						// non-chai errors thrown in the test will be logged.
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

				it("should console.error non-chai errors thrown in the test", async () => {
					const spy = jest.fn();
					page.once("console", (msg) => {
						spy({ type: msg.type(), text: msg.text() });
					});
					await page.evaluate(async (type) => {
						const runner = await window.FCCSandbox.createTestRunner({
							type,
						});
						// non-chai errors thrown in the test should be logged.
						return runner.runTest("throw new Error('test error')");
					}, type);

					expect(spy).toHaveBeenCalledWith({
						type: "error",
						text: "JSHandle@error",
					});
				});
			});
		});

		describe("dom evaluator", () => {
			afterAll(async () => {
				await page.evaluate(() => {
					window.FCCSandbox.getRunner("dom")?.dispose();
				});
			});
			it("should create a sandboxed iframe", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ type: "dom" });
				});

				const iframe = await page.$("iframe");
				const sandbox = await iframe?.evaluate((iframe) => {
					return iframe.getAttribute("sandbox");
				});

				expect(sandbox).toBe("allow-scripts allow-forms");
			});

			it("should hide the iframe from the user", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ type: "dom" });
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

			it("should layout the iframe correctly", async () => {
				const source = `<body>
				indented text
</body>`;

				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "dom",
					});

					return await runner.runTest(
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
						await window.FCCSandbox.createTestRunner({ type: "dom" });

						const otherFrame = document.createElement("iframe");
						// post a message from a different window
						otherFrame.srcdoc = `<script>let frame = window.parent.document.getElementById('test-frame').contentWindow.postMessage({ type: "test", value: "document.body.innerHTML.includes('<h1>Hello World</h1>')" }, "*");
						 </script>`;

						// wait for a message from otherFrame
						const awaitMessage = new Promise((resolve, reject) => {
							setTimeout(() => {
								resolve("done");
							}, 100);
							window.addEventListener("message", function handler() {
								reject(Error("Should not have received a message"));
							});
						});
						document.body.appendChild(otherFrame);

						return await awaitMessage;
					});

					expect(result).toBe("done");
				} finally {
					// clear all iframes
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "dom",
					});
					return await runner.runTest(
						"async () => await document.getElementById('audio').play()",
					);
				}, source);

				// If it were unable to play, it would throw "play() failed because the
				// user didn't interact with the document first". The following error
				// only happens because it does try to play.
				expect(result).toEqual({
					err: { message: "The element has no supported sources." },
				});
			});

			it("should allow tests to access local storage", async () => {
				const source = `<body><h1>Hello World</h1></body>`;
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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

			it("should run the beforeAll function before evaluating the source", async () => {
				const result = await page.evaluate(async () => {
					const runner = await window.FCCSandbox.createTestRunner({
						type: "dom",
						hooks: {
							beforeAll: "window.__before = 'and so it begins'",
						},
					});
					return runner.runTest(
						"assert.equal(window.__before,'and so it begins')",
					);
				});
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
					const runner = await window.FCCSandbox.createTestRunner({
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

			it("should be able to use FakeTimers in tests", async () => {
				const source = `<div id="root"></div><script>
const waitThenUpdate = async () => {
	await new Promise(resolve => setTimeout(resolve, 1000));
	document.getElementById('root').innerHTML = 'Updated';
};
</script>`;

				const beforeAll = `const clock = __FakeTimers.install();`;

				const result = await page.evaluate(
					async (source, beforeAll) => {
						const runner = await window.FCCSandbox.createTestRunner({
							source,
							type: "dom",
							hooks: {
								beforeAll,
							},
						});
						return runner.runTest(`async () => {
const update = waitThenUpdate();
clock.tick(1000);
assert.equal(document.getElementById('root').innerHTML, '');
await update;
assert.equal(document.getElementById('root').innerHTML, 'Updated');
}
`);
					},
					source,
					beforeAll,
				);
				expect(result).toEqual({ pass: true });
			});

			it("should be possible to unmock the timers", async () => {
				const source = "";

				const beforeAll = `let clock = __FakeTimers.install();`;

				const result = await page.evaluate(
					async (source, beforeAll) => {
						const runner = await window.FCCSandbox.createTestRunner({
							source,
							type: "dom",
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
					source,
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
					async (source, beforeAll) => {
						const runner = await window.FCCSandbox.createTestRunner({
							source,
							type: "dom",
							hooks: {
								beforeAll,
							},
						});
						// if the timers weren't mocked this would take 50 seconds and the
						// test would timeout
						const result = await runner.runTest(`async() => {
	const count = countDown();
	clock.runAll();
	assert.equal(await count, 50);
}
`);

						return result;
					},
					source,
					beforeAll,
				);
				expect(result).toEqual({ pass: true });
			});

			// TODO: give all evaluators beforeAll and beforeEach hooks
			it("should have access to assert in the beforeAll function", async () => {
				const source = `<script>
const getFive = () => 5;
</script>`;
				const beforeAll = `const fn = () => assert.equal(getFive(), 5);`;
				const result = await page.evaluate(
					async (source, beforeAll) => {
						const runner = await window.FCCSandbox.createTestRunner({
							source,
							type: "dom",
							hooks: {
								beforeAll,
							},
						});
						return runner.runTest("fn()");
					},
					source,
					beforeAll,
				);
				expect(result).toEqual({ pass: true });
			});

			it("should remove the test evaluator script after it has been evaluated", async () => {
				const source = `<script></script>`;
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "dom",
						code: {
							contents: source,
						},
					});

					// if the test evaluator script is still in the DOM the
					// querySelectorAll will find two scripts
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
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "dom",
						code: {
							contents: source,
						},
						hooks: {
							beforeAll: "window.__before = 'and so it begins'",
						},
					});

					// if the test evaluator script is still in the DOM the
					// querySelectorAll will find two scripts
					return runner.runTest(
						"assert.equal(document.querySelectorAll('script').length, 1);",
					);
				}, source);

				expect(result).toEqual({
					pass: true,
				});
			});

			it.each([
				{ method: "prompt" },
				{ method: "alert" },
				{ method: "confirm" },
			])("should handle calls to window.$method", async ({ method }) => {
				const consoleSpy = jest.fn();

				page.once("console", (msg) => {
					consoleSpy(msg.text());
				});

				const result = await page.evaluate(async (method) => {
					const runner = await window.FCCSandbox.createTestRunner({
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
			});
		});

		describe("javascript evaluator", () => {
			it("should not create a frame", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						type: "javascript",
					});
				});

				const frame = await page.$("iframe");

				expect(frame).toBeFalsy();
			});

			it("should run tests after evaluating the source supplied to the runner", async () => {
				const source = "const getFive = () => 5;";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
					const runner = await window.FCCSandbox.createTestRunner({
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
		});

		describe("python evaluator", () => {
			beforeAll(async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						type: "python",
					});
				});
			});
			it("should run tests after evaluating the source supplied to the runner", async () => {
				const source = `def get_five():
  return 5`;
				const result = await page.evaluate(async (source) => {
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
						source,
					});
				}, source);

				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({});
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({});
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({});
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

			it("should be able to test with mock input", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
						source: `
first = input()
second = input()
`,
					});
					return runner?.runTest(`({ 
	input: ["argle", "bargle"],
  test: () => assert.equal(runPython('first + second'), "arglebargle")
})`);
				});

				expect(result).toEqual({ pass: true });
			});

			it("should make user code available to the python code as the _code variable", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({});
					return runner?.runTest(`({ 
  test: () => assert.equal(runPython('_Node("x = 1").get_variable("x")'), 1)
})`);
				});

				expect(result).toEqual({ pass: true });
			});

			it("should return error types if the python code raises an exception", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({});
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
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
					const runner = window.FCCSandbox.getRunner("python");
					await runner?.init({
						source,
					});
					// since the comparison includes a PyProxy object, that will be
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
		});
	});
});
