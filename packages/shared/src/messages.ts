import type { Pass, Fail } from "./interfaces/test-evaluator";
import { format } from "./format";
import { hasDefinedProperty } from "./has-defined-property";

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
      const hasActual = hasDefinedProperty(result.err, "actual");
      const actual = hasActual ? format(result.err.actual) : undefined;
      const hasExpected = hasDefinedProperty(result.err, "expected");
      const expected = hasExpected ? format(result.err.expected) : undefined;

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
