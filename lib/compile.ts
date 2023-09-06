import { CodeNodeType } from "./class/node.js";
import { options } from "./option-types.js";

export const compile = (cst, options: Partial<options> = {}) => {
  const keepProtected = options.safe === true || options.keepProtected === true;
  let firstSeen = false;

  const walk = (node: CodeNodeType, child?: CodeNodeType) => {
    let output = "";
    let inner;
    let lines;

    for (const child of node.nodes) {
      switch (child.type) {
        case "block":
          if (options.first && firstSeen === true) {
            output += walk(child, node);
            break;
          }

          if (options.preserveNewlines === true) {
            inner = walk(child, node);
            lines = inner.split("\n");
            output += "\n".repeat(lines.length - 1);
            break;
          }

          if (keepProtected === true && child.protected === true) {
            output += walk(child, node);
            break;
          }

          firstSeen = true;
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

    return output;
  };

  return walk(cst);
};
