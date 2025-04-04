"use strict";

import { CodeNode, Block } from "./class/node";
import { options } from "./option-types";
import { languages } from "./languages";

const constants = {
  ESCAPED_CHAR_REGEX: /^\\./,
  // The QUOTED_STRING_REGEX looks for an opening quote, then any number of
  // escaped quotes or characters that are not the opening quote. Finally, it
  // looks for the closing quote.
  QUOTED_STRING_REGEX: /^([`'"])((?:\\\1|(?!\1).)*)\1/s,
  NEWLINE_REGEX: /^\r*\n/,
};

export const parse = (input: string, options: Partial<options> = {}) => {
  if (typeof input !== "string") {
    throw new TypeError("Expected input to be a string");
  }

  const cst = new Block({ type: "root", nodes: [], value: "" });
  const stack = [cst];
  const name = (options.language || "javascript").toLowerCase();
  const lang = languages[name];

  if (typeof lang === "undefined") {
    throw new Error(`Language "${name}" is not supported by strip-comments`);
  }

  const { LINE_REGEX, BLOCK_OPEN_REGEX, BLOCK_CLOSE_REGEX } = lang;
  let block = cst;
  let remaining = input;
  let token;
  let prev: Block | CodeNode | undefined;

  const source = [BLOCK_OPEN_REGEX, BLOCK_CLOSE_REGEX].filter<RegExp>(
    (x): x is RegExp => typeof x !== "undefined",
  );
  let tripleQuotes = false;

  if (source.every((regex) => regex.source === '^"""')) {
    tripleQuotes = true;
  }

  /**
   * Helpers
   */

  const consume = (value = remaining[0] || "") => {
    remaining = remaining.slice(value.length);
    return value;
  };

  const scan = (
    regex: RegExp,
    type = "text",
  ):
    | { type: string; match: RegExpExecArray; value: string; newline?: string }
    | undefined => {
    const match = regex.exec(remaining);
    if (match) {
      consume(match[0]);
      return { type, value: match[0], match };
    }
  };

  const push = (node: Block | CodeNode) => {
    if (prev && prev.type === "text" && node.type === "text") {
      prev.value = prev.value ? prev.value + node.value : node.value;
      return;
    }

    block.push(node);
    if ("nodes" in node && node.nodes) {
      stack.push(node);
      block = node;
    }

    prev = node;
  };

  const pop = () => {
    if (block.type === "root") {
      throw new SyntaxError("Unclosed block comment");
    }

    stack.pop();
    block = stack[stack.length - 1];
  };

  /**
   * Parse input string
   */

  // eslint-disable-next-line no-unmodified-loop-condition
  while (remaining !== "") {
    // Escaped characters
    if ((token = scan(constants.ESCAPED_CHAR_REGEX, "text"))) {
      push(new Block(token));
      continue;
    }

    // Quoted strings
    if (
      block.type !== "block" &&
      (!prev || !/\w$/.test(prev.value ?? "")) &&
      !(tripleQuotes && remaining.startsWith('"""'))
    ) {
      if ((token = scan(constants.QUOTED_STRING_REGEX, "text"))) {
        push(new CodeNode(token));
        continue;
      }
    }

    // Newlines
    if ((token = scan(constants.NEWLINE_REGEX, "newline"))) {
      push(new CodeNode(token));
      continue;
    }

    // Block comment open
    if (
      BLOCK_OPEN_REGEX &&
      options.block &&
      !(tripleQuotes && block.type === "block")
    ) {
      if ((token = scan(BLOCK_OPEN_REGEX, "open"))) {
        push(new Block({ type: "block" }));
        push(new CodeNode(token));
        continue;
      }
    }

    // Block comment close
    if (BLOCK_CLOSE_REGEX && block.type === "block" && options.block) {
      if ((token = scan(BLOCK_CLOSE_REGEX, "close"))) {
        token.newline = token.match[1] || "";
        push(new CodeNode(token));
        pop();
        continue;
      }
    }

    // Line comment
    if (LINE_REGEX && block.type !== "block" && options.line) {
      if ((token = scan(LINE_REGEX, "line"))) {
        push(new CodeNode(token));
        continue;
      }
    }

    // Plain text (skip "C" since some languages use "C" to start comments)
    if ((token = scan(/^[a-zABD-Z0-9\t ]+/, "text"))) {
      push(new CodeNode(token));
      continue;
    }

    push(new CodeNode({ type: "text", value: consume(remaining[0]) }));
  }

  return cst;
};
