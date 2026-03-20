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
      const hasActual = Object.hasOwn(result.err, "actual");
      const actual = hasActual ? format(rawActual) : undefined;
      const rawExpected = result.err?.expected;
      const hasExpected = Object.hasOwn(result.err, "expected");
      const expected = hasExpected ? format(rawExpected) : undefined;

      const msgClone = {
        type: "result",
        value: {
          err: {
            ...result.err,
            ...(hasActual && { actual }),
            ...(hasExpected && { expected }),
          },
        },
      };
      postMessage(msgClone);
    }
  }
};
