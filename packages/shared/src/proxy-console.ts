export const LEVELS = [
  "trace",
  "debug",
  "info",
  "log",
  "warn",
  "error",
] as const;

type Level = (typeof LEVELS)[number];

const PRESERVE_HTML_ENTITIES = ["amp", "lt", "gt", "quot", "apos"];

// Double-encode PRESERVE_HTML_ENTITIES so they survive decoding by sanitizeHtml
// in freeCodeCamp/client/src/templates/Challenges/components/output.tsx
function preserveHtmlEntities(str: string): string {
  const entityPattern = new RegExp(
    `&(${PRESERVE_HTML_ENTITIES.join("|")})(;?)`,
    "g",
  );
  return str.replace(entityPattern, "&amp;$1$2");
}

export class ProxyConsole {
  #originalConsole: Console;
  #proxyConsole: Console;
  #isOn: boolean = false;
  #calls: { level: Level; msg: string }[] = [];
  #format: (x: unknown) => string;

  constructor(originalConsole: Console, format: (x: unknown) => string) {
    this.#originalConsole = { ...originalConsole };
    this.#proxyConsole = originalConsole;
    this.#format = format;
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
        const msg = preserveHtmlEntities(
          args.map((arg) => this.#format(arg)).join(" "),
        );
        this.#calls.push({ level, msg });
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
    const logs = this.#calls;
    this.#calls = [];
    return logs.length ? { logs } : {};
  }
}
