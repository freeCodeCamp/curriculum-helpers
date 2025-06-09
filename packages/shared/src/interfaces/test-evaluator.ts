type Level = "log" | "warn" | "error" | "info" | "debug" | "trace";

interface Logged {
  logs?: { level: Level; msg: string }[];
}

export interface Pass extends Logged {
  pass: true;
}

export interface Fail extends Logged {
  err: {
    message: string;
    stack?: string;
    // TODO: enforce string for expected and actual?
    expected?: unknown;
    actual?: unknown;
    type?: string;
  };
}

export type TestEvent = MessageEvent<{ type: "test"; value: string }>;
export type InitEvent<Data> = MessageEvent<{
  type: "init";
  value: Data;
}>;

export interface InitTestFrameOptions {
  code?: {
    contents?: string;
    editableContents?: string;
  };
  loadEnzyme?: boolean;
  source?: string;
  hooks?: {
    beforeAll?: string;
  };
}

export interface InitWorkerOptions {
  code?: {
    contents?: string;
    editableContents?: string;
  };
  source?: string;
  hooks?: {
    beforeEach?: string;
    beforeAll?: string;
  };
}

export interface TestEvaluator {
  init(opts: unknown): Promise<void> | void;
  runTest(test: string): Promise<Pass | Fail>;
  handleMessage(e: MessageEvent): Promise<void>;
}
