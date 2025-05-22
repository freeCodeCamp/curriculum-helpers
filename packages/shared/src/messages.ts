import type { Pass, Fail } from "./interfaces/test-evaluator";
import { format } from "./format";

type Message = {
	type: "result";
	value: Pass | Fail;
};

export const postCloneableMessage = (
	postMessage: (msg: unknown) => void,
	msg: Message,
): void => {
	try {
		postMessage(msg);
	} catch {
		// If we're unable to post the message, it must be because at least one
		// of 'actual' or 'expected' is not transferable.
		const result = msg.value;
		if ("err" in result) {
			const rawActual = result.err?.actual;
			const actual = rawActual ? format(rawActual) : undefined;
			const rawExpected = result.err?.expected;
			const expected = rawExpected ? format(rawExpected) : undefined;

			const msgClone = {
				type: "result",
				value: {
					err: {
						...result.err,
						actual,
						expected,
					},
				},
			};
			postMessage(msgClone);
		}
	}
};
