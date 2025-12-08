import type {
  InitEvent,
  TestEvent,
  InitWorkerOptions,
  InitTestFrameOptions,
  Pass,
  Fail,
  CodeEvent,
} from "../../shared/src/interfaces/test-evaluator";

import {
  TEST_EVALUATOR_SCRIPT_ID,
  TEST_EVALUATOR_HOOKS_ID,
} from "../../shared/src/ids";
import { post } from "../../shared/src/awaitable-post";

interface Runner {
  init(opts?: InitOptions, timeout?: number): Promise<void>;
  // Note: timeouts are currently ignored in the FrameRunner, since the purpose
  // is to stop evaluation if it is looping indefinitely, but any abort
  // mechanism (e.g. Promise.race or AbortController) would not get called in
  // that case.
  runTest(test: string, timeout?: number): Promise<Pass | Fail>;
  runAllTests(tests: string[], timeout?: number): Promise<(Pass | Fail)[]>;
  dispose(): void;
}

const getFullAssetPath = (assetPath = "/dist/") => {
  const isAbsolute = assetPath.startsWith("/");
  const hasTrailingSlash = assetPath.endsWith("/");
  if (!isAbsolute) {
    assetPath = "/" + assetPath;
  }

  if (!hasTrailingSlash) {
    assetPath += "/";
  }

  return assetPath;
};

const fetchListener = (event: MessageEvent) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (event.data.type === "fetch") {
    const { url, options } = event.data as {
      url: string;
      options?: RequestInit;
    };

    void fetch(url, {
      ...options,
      credentials: "omit",
    }).then(async (res) => {
      const text = await res.text();

      event.ports[0].postMessage({
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        text,
      });
    });
  }
};

type RunnerConfig = {
  assetPath?: string;
  script: string;
  hooks?: {
    beforeAll?: string;
  };
  loadEnzyme?: boolean;
};

type InitOptions = {
  code?: {
    contents?: string;
    editableContents?: string;
  };
  hooks?: {
    beforeAll?: string;
    beforeEach?: string;
    afterEach?: string;
  };
};

const hideFrame = (iframe: HTMLIFrameElement) => {
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.visibility = "hidden";
};

const hideAllowingAnimations = (iframe: HTMLIFrameElement) => {
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
};

const resetCSS = (iframe: HTMLIFrameElement) => {
  iframe.style.position = "";
  iframe.style.left = "";
  iframe.style.top = "";
  iframe.style.visibility = "";
  iframe.style.width = "";
  iframe.style.height = "";
  iframe.style.opacity = "";
  iframe.style.pointerEvents = "";
};

export class DOMTestRunner implements Runner {
  #testEvaluator: HTMLIFrameElement;
  #script: string;
  #afterAll?: string;

  #createTestEvaluator({ assetPath, script }: RunnerConfig) {
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts", "allow-forms");
    iframe.allow = "autoplay";
    iframe.id = "test-frame";

    const scriptUrl = getFullAssetPath(assetPath) + script;
    const scriptHTML = `<script id='${TEST_EVALUATOR_SCRIPT_ID}' src='${scriptUrl}'></script>`;

    return { iframe, scriptHTML };
  }

  constructor(config: RunnerConfig) {
    const { scriptHTML, iframe } = this.#createTestEvaluator(config);
    this.#testEvaluator = iframe;
    this.#script = scriptHTML;
    this.#addEventListener("message", fetchListener);
  }

  #addEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
  ): void {
    const safeListener = (event: MessageEvent) => {
      if (
        event.origin === "null" &&
        event.source === this.#testEvaluator.contentWindow
      ) {
        listener(event);
      }
    };

    window.addEventListener("message", safeListener);
  }

  // Rather than trying to create an async constructor, we'll use an init method
  async init(opts: InitTestFrameOptions, timeout?: number) {
    const { hooks } = opts;
    const hooksScript = hooks?.beforeAll
      ? `<script id='${TEST_EVALUATOR_HOOKS_ID}'>
${hooks.beforeAll}
</script>`
      : "";

    this.#afterAll = hooks?.afterAll;

    const isReady = new Promise((resolve, reject) => {
      const timerId = setTimeout(
        () => reject(Error("Timed out waiting for the test frame to load")),
        timeout,
      );
      const listener = () => {
        this.#testEvaluator.removeEventListener("load", listener);
        clearTimeout(timerId);
        resolve(true);
      };

      this.#testEvaluator.addEventListener("load", listener);
    });

    // Note: the order matters a lot, because the source could include unclosed
    // tags. Putting the script first means the script will always be correctly
    // evaluated.
    this.#testEvaluator.srcdoc = `
${this.#script}
${hooksScript}
${opts.source}`;

    resetCSS(this.#testEvaluator);
    // Whether or not animations will run depends on the browser. By default, at
    // time of writing, Firefox allows animations in offscreen iframes, while
    // Chrome does not. If this option is set, we try and allow animations by
    // making the frame tiny but visible.
    if (opts.allowAnimations) {
      hideAllowingAnimations(this.#testEvaluator);
    } else {
      hideFrame(this.#testEvaluator);
    }

    document.body.appendChild(this.#testEvaluator);
    await isReady;

    const msg: InitEvent<InitTestFrameOptions>["data"] = {
      type: "init",
      value: opts,
    };

    await post({
      messenger: this.#testEvaluator.contentWindow!,
      message: msg,
    });
  }

  runTest(test: string) {
    const result = post<{ value: Pass | Fail }>({
      messenger: this.#testEvaluator.contentWindow!,
      message: {
        type: "test",
        value: test,
      } as TestEvent["data"],
    }).then(({ value }) => value);

    return result;
  }

  async #runCode(code: string) {
    const msg: CodeEvent["data"] = {
      type: "code",
      value: code,
    };

    return post({
      messenger: this.#testEvaluator.contentWindow!,
      message: msg,
    });
  }

  async runAllTests(tests: string[]): Promise<(Pass | Fail)[]> {
    const results: (Pass | Fail)[] = [];

    for (const test of tests) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.runTest(test);
      results.push(result);
    }

    if (this.#afterAll) {
      await this.#runCode(this.#afterAll);
    }

    return results;
  }

  dispose() {
    this.#testEvaluator.remove();
  }
}

export class WorkerTestRunner implements Runner {
  #testEvaluator: Worker;
  #opts: InitWorkerOptions | null = null;
  #timeout?: number;
  #scriptUrl = "";

  #createTestEvaluator({ assetPath, script }: RunnerConfig) {
    this.#scriptUrl = getFullAssetPath(assetPath) + script;
    return new Worker(this.#scriptUrl);
  }

  constructor(config: RunnerConfig) {
    this.#testEvaluator = this.#createTestEvaluator(config);
    this.#addEventListener("message", fetchListener);
  }

  #addEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
  ): void {
    this.#testEvaluator.addEventListener("message", listener);
  }

  async init(opts: InitWorkerOptions, timeout?: number) {
    this.#opts = opts;
    this.#timeout = timeout;
    const msg: InitEvent<InitWorkerOptions>["data"] = {
      type: "init",
      value: opts,
    };

    let timerId;
    const isFrozen = new Promise<void>((_resolve, reject) => {
      timerId = setTimeout(
        () =>
          reject(
            new Error("Timed out waiting for the test worker to initialize"),
          ),
        timeout,
      );
    });

    const response = post({
      messenger: this.#testEvaluator,
      message: msg,
    });

    await Promise.race([response, isFrozen]);

    clearTimeout(timerId);
  }

  async #recreateRunner() {
    if (!this.#opts || !this.#scriptUrl) {
      throw new Error("WorkerTestRunner not initialized");
    } else {
      this.#testEvaluator = new Worker(this.#scriptUrl);
      await this.init(this.#opts, this.#timeout);
    }
  }

  async #runCode(code: string) {
    const msg: CodeEvent["data"] = {
      type: "code",
      value: code,
    };

    return post({
      messenger: this.#testEvaluator,
      message: msg,
    });
  }

  async runTest(test: string, timeout = 5000) {
    let terminateTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const terminate = new Promise<Fail>((resolve) => {
      terminateTimeoutId = setTimeout(() => {
        this.dispose();
        void this.#recreateRunner().then(() => {
          resolve({ err: { message: "Test timed out" } });
        });
      }, timeout);
    });

    const msg: TestEvent["data"] = {
      type: "test",
      value: test,
    };

    const result = post<{ value: Pass | Fail }>({
      messenger: this.#testEvaluator,
      message: msg,
    }).then(({ value }) => value);

    try {
      return await Promise.race([result, terminate]);
    } finally {
      clearTimeout(terminateTimeoutId);
    }
  }

  async runAllTests(tests: string[], timeout = 5000): Promise<(Pass | Fail)[]> {
    const results: (Pass | Fail)[] = [];

    for (const test of tests) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.runTest(test, timeout);
      results.push(result);
    }

    if (this.#opts?.hooks?.afterAll) {
      await this.#runCode(this.#opts.hooks.afterAll);
    }

    return results;
  }

  dispose() {
    this.#testEvaluator.terminate();
  }
}
