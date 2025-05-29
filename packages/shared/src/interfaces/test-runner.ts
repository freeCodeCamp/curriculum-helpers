import { Fail, Pass } from "./test-evaluator";

export type ReadyEvent = MessageEvent<{ type: "ready" }>;
export type ResultEvent = MessageEvent<{
	type: "result";
	value: Pass | Fail;
}>;
