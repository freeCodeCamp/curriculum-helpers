export const LEVELS = [
	"trace",
	"debug",
	"info",
	"log",
	"warn",
	"error",
] as const;

type Level = (typeof LEVELS)[number];

export class ProxyConsole {
	#originalConsole: Console;
	#proxyConsole: Console;
	#isOn: boolean = false;
	#calls: { level: Level; args: unknown[] }[] = [];

	constructor(originalConsole: Console) {
		this.#originalConsole = { ...originalConsole };
		this.#proxyConsole = originalConsole;
	}

	on() {
		if (this.#isOn)
			throw Error(
				"Console is already on. It is likely that tests are running in parallel. This is not supported.",
			);
		this.#isOn = true;

		for (const level of LEVELS) {
			this.#proxyConsole[level] = (...args: unknown[]) => {
				this.#originalConsole[level](...args);
				this.#calls.push({ level, args });
			};
		}
	}

	off() {
		if (!this.#isOn) return;
		this.#isOn = false;

		for (const level of LEVELS) {
			this.#proxyConsole[level] = this.#originalConsole[level];
		}
	}

	flush() {
		const out = this.#calls;
		this.#calls = [];
		return out;
	}
}

export const createLogFlusher =
	(proxy: ProxyConsole, format: (x: unknown) => string) => () => {
		const rawLogs = proxy.flush();
		const logs = rawLogs.map(({ level, args }) => ({
			level,
			msg: args.map((arg) => format(arg)).join(" "),
		}));
		return logs.length ? { logs } : {};
	};
