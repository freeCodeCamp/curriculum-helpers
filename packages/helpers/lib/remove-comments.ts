import { tokenize, isTokenComment } from "@csstools/css-tokenizer";
import { parser as pythonParser } from "@lezer/python";
import { defaultTreeAdapter, parseFragment } from "parse5";
import { Parser, type Options } from "acorn";
import jsx from "acorn-jsx";
import { LooseParser } from "acorn-loose";

const JavaScriptParser = Parser.extend(jsx());

class RecoveringJavaScriptParser extends LooseParser {
  static BaseParser = JavaScriptParser;
}

type Range = { from: number; to: number };

function removeRanges(
  code: string,
  ranges: Range[],
  javascript = false,
): string {
  const parts: string[] = [];
  let end = 0;
  for (const range of ranges) {
    parts.push(code.slice(end, range.from));
    if (javascript) {
      // Line terminators inside block comments affect automatic semicolon
      // insertion. A separator also prevents adjacent tokens from merging.
      const newlines = code
        .slice(range.from, range.to)
        .match(/[\r\n\u2028\u2029]/g);
      if (newlines) {
        parts.push(newlines.join(""));
      } else if (
        range.from > 0 &&
        range.to < code.length &&
        !/\s/.test(code[range.from - 1]) &&
        !/\s/.test(code[range.to])
      ) {
        parts.push(" ");
      }
    }

    end = range.to;
  }

  parts.push(code.slice(end));
  return parts.join("");
}

/** Remove Python comments while preserving strings and floor division. */
export function removePythonComments(code: string): string {
  const ranges: Range[] = [];
  pythonParser.parse(code).iterate({
    enter(node) {
      if (node.name === "Comment") {
        ranges.push({ from: node.from, to: node.to });
        return false;
      }
    },
  });
  return removeRanges(code, ranges);
}

/** Remove CSS comments while preserving strings and URL contents. */
export function removeCssComments(code: string): string {
  return removeRanges(
    code,
    tokenize({ css: code })
      .filter(isTokenComment)
      .map((token) => ({ from: token[2], to: token[3] + 1 })),
  );
}

/** Remove HTML comments without reserializing elements, attributes or text. */
export function removeHtmlComments(code: string): string {
  // Retain the original spelling, whitespace and malformed markup rather than
  // serializing the parsed tree. Track comments even in template contents.
  const comments: ReturnType<typeof defaultTreeAdapter.createCommentNode>[] =
    [];
  parseFragment(code, {
    sourceCodeLocationInfo: true,
    treeAdapter: {
      ...defaultTreeAdapter,
      createCommentNode(data) {
        const node = defaultTreeAdapter.createCommentNode(data);
        comments.push(node);
        return node;
      },
    },
  });
  return removeRanges(
    code,
    comments.flatMap(({ sourceCodeLocation: location }) =>
      location ? [{ from: location.startOffset, to: location.endOffset }] : [],
    ),
  );
}

/**
 * Remove JavaScript comments, including those inside template interpolations.
 * Preserve line terminators and separate tokens formerly divided by a comment.
 */
export function removeJSComments(code: string): string {
  const comments: Range[] = [];
  const options: Options = {
    ecmaVersion: "latest",
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    onComment(_block, _text, from, to) {
      if (from < code.length) {
        comments.push({ from, to: Math.min(to, code.length) });
      }
    },
  };

  try {
    JavaScriptParser.parse(code, options);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;

    comments.length = 0;
    // Finish trailing block comments and quoted JSX attributes for the lexer.
    // Otherwise recovery can treat attribute contents as JavaScript comments.
    // Clip ranges to the source so these synthetic delimiters never escape.
    RecoveringJavaScriptParser.parse(code + "\n*/'\"", options);
  }

  return removeRanges(code, comments, true);
}
