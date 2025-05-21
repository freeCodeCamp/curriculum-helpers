/**
 * @jest-environment jsdom
 */

import { ProxyConsole } from "./proxy-console";

const LEVELS = ["trace", "debug", "info", "log", "warn", "error"] as const;

const levelsForEach = LEVELS.map((level) => ({
	level,
}));

describe("proxy-console", () => {
	let originalConsole: typeof console;
	beforeAll(() => {
		originalConsole = { ...console };
	});

	beforeEach(() => {
		// Reset the console to its original state before each test
		window.console = { ...originalConsole };
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("should replace console methods when .on is called", () => {
		const proxy = new ProxyConsole(window.console);

		proxy.on();

		for (const level of LEVELS) {
			expect(window.console[level]).not.toEqual(originalConsole[level]);
		}
	});

	it("should restore console methods when .off is called", () => {
		const proxy = new ProxyConsole(window.console);

		proxy.on();
		proxy.off();

		for (const level of LEVELS) {
			expect(window.console[level]).toEqual(originalConsole[level]);
		}
	});

	it.each(levelsForEach)(
		"should proxy to the original console.$level",
		({ level }) => {
			const logSpy = jest.spyOn(window.console, level).mockImplementation();
			const proxy = new ProxyConsole(window.console);

			proxy.on();
			window.console[level]("test message");

			expect(logSpy).toHaveBeenCalledWith("test message");
		},
	);

	describe("flush", () => {
		it("should return an empty array if no calls were recorded", () => {
			const proxy = new ProxyConsole(window.console);

			proxy.on();
			const results = proxy.flush();

			expect(results).toEqual([]);
		});

		it("should return all the calls recorded while proxying", () => {
			jest.spyOn(window.console, "log").mockImplementation();
			jest.spyOn(window.console, "warn").mockImplementation();
			const proxy = new ProxyConsole(window.console);
			proxy.on();

			window.console.log("test message 1");
			window.console.warn("test message 2");
			const results = proxy.flush();

			expect(results).toEqual([
				{ level: "log", args: ["test message 1"] },
				{ level: "warn", args: ["test message 2"] },
			]);
		});

		it("should clear the calls after flushing", () => {
			jest.spyOn(window.console, "log").mockImplementation();
			const proxy = new ProxyConsole(window.console);
			proxy.on();

			window.console.log("test message 1");
			proxy.flush();
			const results = proxy.flush();

			expect(results).toEqual([]);
		});
	});
});
