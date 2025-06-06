import type { ReadyEvent } from "../../shared/src/interfaces/test-runner";
import type {
  InitEvent,
  TestEvent,
  InitWorkerOptions,
  InitTestFrameOptions,
  Pass,
  Fail,
} from "../../shared/src/interfaces/test-evaluator";

import {
  TEST_EVALUATOR_SCRIPT_ID,
  TEST_EVALUATOR_HOOKS_ID,
} from "../../shared/src/ids";
import { post } from "./awaitable-post";

interface Runner {
  init(opts?: InitOptions): Promise<void>;
  // Note: timeouts are currently ignored in the FrameRunner, since the purpose
  // is to stop evaluation if it is looping indefinitely, but any abort
  // mechanism (e.g. Promise.race or AbortController) would not get called in
  // that case.
  runTest(test: string, timeout?: number): Promise<Pass | Fail>;
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
  };
};

const hideFrame = (iframe: HTMLIFrameElement) => {
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.visibility = "hidden";
};

export class DOMTestRunner implements Runner {
  #testEvaluator: HTMLIFrameElement;
  #script: string;

  #createTestEvaluator({ assetPath, script }: RunnerConfig) {
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts", "allow-forms");
    iframe.allow = "autoplay";
    iframe.id = "test-frame";
    hideFrame(iframe);

    const scriptUrl = getFullAssetPath(assetPath) + script;
    const scriptHTML = `<script id='${TEST_EVALUATOR_SCRIPT_ID}' src='${scriptUrl}'></script>`;

    return { iframe, scriptHTML };
  }

  constructor(config: RunnerConfig) {
    const { scriptHTML, iframe } = this.#createTestEvaluator(config);
    this.#testEvaluator = iframe;
    this.#script = scriptHTML;
  }

  // Rather than trying to create an async constructor, we'll use an init method
  async init(opts: InitTestFrameOptions) {
    const { hooks } = opts;
    const hooksScript = hooks?.beforeAll
      ? `<script id='${TEST_EVALUATOR_HOOKS_ID}'>
${hooks.beforeAll}
</script>`
      : "";

    const isReady = new Promise((resolve) => {
      const listener = () => {
        this.#testEvaluator.removeEventListener("load", listener);
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

    document.body.appendChild(this.#testEvaluator);
    await isReady;

    const isInitialized = new Promise((resolve) => {
      const listener = (event: ReadyEvent) => {
        if (
          event.origin === "null" &&
          event.source === this.#testEvaluator.contentWindow &&
          event.data.type === "ready"
        ) {
          window.removeEventListener("message", listener);
          resolve(true);
        }
      };

      window.addEventListener("message", listener);
    });

    const msg: InitEvent<InitTestFrameOptions>["data"] = {
      type: "init",
      value: opts,
    };
    this.#testEvaluator.contentWindow?.postMessage(msg, "*");

    await isInitialized;
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

  dispose() {
    this.#testEvaluator.remove();
  }
}

export class WorkerTestRunner implements Runner {
  #testEvaluator: Worker;
  #opts: InitWorkerOptions | null = null;
  #scriptUrl = "";

  #createTestEvaluator({ assetPath, script }: RunnerConfig) {
    this.#scriptUrl = getFullAssetPath(assetPath) + script;
    return new Worker(this.#scriptUrl);
  }

  constructor(config: RunnerConfig) {
    this.#testEvaluator = this.#createTestEvaluator(config);
  }

  async init(opts: InitWorkerOptions) {
    this.#opts = opts;
    const isInitialized = new Promise((resolve) => {
      const listener = (event: ReadyEvent) => {
        if (event.data.type === "ready") {
          this.#testEvaluator.removeEventListener("message", listener);
          resolve(true);
        }
      };

      this.#testEvaluator.addEventListener("message", listener);
    });

    const msg: InitEvent<InitWorkerOptions>["data"] = {
      type: "init",
      value: opts,
    };
    this.#testEvaluator.postMessage(msg);
    await isInitialized;
  }

  async #recreateRunner() {
    if (!this.#opts || !this.#scriptUrl) {
      throw new Error("WorkerTestRunner not initialized");
    } else {
      this.#testEvaluator = new Worker(this.#scriptUrl);
      await this.init(this.#opts);
    }
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

  dispose() {
    this.#testEvaluator.terminate();
  }
}
