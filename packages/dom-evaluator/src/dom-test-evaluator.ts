import jQuery from "jquery";
import * as helpers from "../../helpers/lib";
import FakeTimers from "@sinonjs/fake-timers";
import chai from "chai";

import type {
	TestEvaluator,
	Fail,
	TestEvent,
	InitEvent,
	Pass,
} from "../../shared/types/test-evaluator";
import type { ReadyEvent } from "../../shared/types/test-runner";

import { postCloneableMessage } from "../../shared/src/messages";
import {
	TEST_EVALUATOR_SCRIPT_ID,
	TEST_EVALUATOR_HOOKS_ID,
} from "../../shared/src/ids";
import { MockLocalStorage } from "./mock-local-storage";
import { createLogFlusher, ProxyConsole } from "../../shared/src/proxy-console";
import { format } from "../../shared/src/format";

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };

export interface InitTestFrameOptions {
	code: {
		contents?: string;
		editableContents?: string;
	};
	loadEnzyme?: boolean;
	hooks?: {
		beforeAll?: string;
	};
}

declare global {
	interface Window {
		$: typeof jQuery;
		__FakeTimers: typeof FakeTimers;
		assert: typeof chai.assert;
	}
}

window.$ = jQuery;
window.__FakeTimers = FakeTimers;
window.assert = chai.assert;

// localStorage is not accessible in a sandboxed iframe, so we need to mock it
Object.defineProperty(window, "localStorage", {
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
	#flushLogs: ReturnType<typeof createLogFlusher>;
	constructor(proxyConsole: ProxyConsole = new ProxyConsole(window.console)) {
		this.#proxyConsole = proxyConsole;
		this.#flushLogs = createLogFlusher(this.#proxyConsole, format);
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
			Object.getOwnPropertyNames(o).forEach(function (prop) {
				if (
					Object.prototype.hasOwnProperty.call(o, prop) &&
					o[prop] !== null &&
					(typeof o[prop] === "object" || typeof o[prop] === "function") &&
					!Object.isFrozen(o[prop])
				) {
					DeepFreeze(o[prop] as Record<string, unknown>);
				}
			});
			return o;
		};

		const __helpers = helpers;
		/* eslint-enable @typescript-eslint/no-unused-vars */

		let Enzyme;
		if (opts.loadEnzyme) {
			/* eslint-disable prefer-const */
			let Adapter16;

			[{ default: Enzyme }, { default: Adapter16 }] = await Promise.all([
				import(/* webpackChunkName: "enzyme" */ "enzyme"),
				import(
					/* webpackChunkName: "enzyme-adapter" */ "enzyme-adapter-react-16"
				),
			]);

			Enzyme.configure({ adapter: new Adapter16() });
			/* eslint-enable prefer-const */
		}

		this.#runTest = async function (testString: string): Promise<Fail | Pass> {
			this.#proxyConsole.on();
			// uncomment the following line to inspect
			// the frame-runner as it runs tests
			// make sure the dev tools console is open
			// debugger;
			try {
				// eval test string to actual JavaScript
				// This return can be a function
				// i.e. function() { assert(true, 'happy coding'); }
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const test = await eval(testString);
				if (typeof test === "function") {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					await test();
				}
				return { pass: true, ...this.#flushLogs() };
			} catch (err) {
				this.#proxyConsole.off();
				console.error(err);

				const error = err as Fail["err"];
				// to provide useful debugging information when debugging the tests, we
				// have to extract the message, stack and, if they exist, expected and
				// actual before returning
				return {
					err: {
						message: error.message,
						stack: error.stack,
						...(!!error.expected && { expected: error.expected }),
						...(!!error.actual && { actual: error.actual }),
					},
					...this.#flushLogs(),
				};
			} finally {
				this.#proxyConsole.off();
			}
		};

		return Promise.resolve();
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(
		e: TestEvent | InitEvent<InitTestFrameOptions>,
	): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			const msg = { type: "result" as const, value: result };
			postCloneableMessage((msg) => self.parent.postMessage(msg, "*"), msg);
		} else if (e.data.type === "init") {
			await this.init(e.data.value);
			self.parent.postMessage(READY_MESSAGE, "*");
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
