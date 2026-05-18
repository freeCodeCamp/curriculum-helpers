type Level = "log" | "warn" | "error" | "info" | "debug" | "trace";

interface Logged {
  logs?: { level: Level; msg: string }[];
}

export interface Pass extends Logged {
  pass: true;
}

export interface TestError {
  message: string;
  stack?: string;
  // TODO: enforce string for expected and actual?
  expected?: unknown;
  actual?: unknown;
  type?: string;
  name?: string;
}

export interface Fail extends Logged {
  err: TestError;
}

export type TestEvent = MessageEvent<{ type: "test"; value: string }>;
export type CodeEvent = MessageEvent<{ type: "code"; value: string }>;
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
    beforeEach?: string;
    afterEach?: string;
    afterAll?: string;
  };
  allowAnimations?: boolean;
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
    afterEach?: string;
    afterAll?: string;
  };
}

export interface TestEvaluator {
  init(opts: unknown): Promise<void> | void;
  runTest(test: string): Promise<Pass | Fail>;
  handleMessage(e: MessageEvent): Promise<void>;
}
