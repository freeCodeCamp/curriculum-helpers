import { Block, CodeNode } from "./class/node";
import { options } from "./option-types";

const commentSeparator = (comment: string, before: string, after: string) => {
  const newlines = comment.match(/[\r\n\u2028\u2029]/g);
  if (newlines) return newlines.join("");
  return before && after && !/\s$/.test(before) && !/^\s/.test(after)
    ? " "
    : "";
};

export const compile = (cst: CodeNode, options: Partial<options> = {}) => {
  const keepProtected = options.safe === true || options.keepProtected === true;
  let firstSeen = false;

  const walk = (node: CodeNode | Block) => {
    let output = "";
    let inner;
    let lines;

    if ("nodes" in node) {
      for (const [index, child] of node.nodes.entries()) {
        switch (child.type) {
          case "block":
            if (options.first && firstSeen === true) {
              output += walk(child);
              break;
            }

            if (options.preserveNewlines === true) {
              inner = walk(child);
              lines = inner.split("\n");
              output += "\n".repeat(lines.length - 1);
              break;
            }

            if (keepProtected === true && child.protected === true) {
              output += walk(child);
              break;
            }

            firstSeen = true;
            if (
              (options.language || "javascript").toLowerCase() === "javascript"
            ) {
              // Comments separate tokens, and their line terminators can
              // affect automatic semicolon insertion.
              output += commentSeparator(
                walk(child),
                output,
                node.nodes[index + 1]?.value || "",
              );
            }

            break;
          case "line":
            if (options.first && firstSeen === true) {
              output += child.value;
              break;
            }

            if (keepProtected === true && child.protected === true) {
              output += child.value;
            }

            firstSeen = true;
            break;
          case "open":
          case "close":
          case "text":
          case "newline":
          default: {
            output += child.value || "";
            break;
          }
        }
      }
    }

    return output;
  };

  return walk(cst);
};
