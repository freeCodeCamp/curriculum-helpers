import { tokenize, isTokenComment } from "@csstools/css-tokenizer";
import { parser as pythonParser } from "@lezer/python";
import { defaultTreeAdapter, parseFragment } from "parse5";
import {
  createScanner,
  createSourceFile,
  isJsxText,
  isRegularExpressionLiteral,
  isStringLiteral,
  isTemplateLiteralToken,
  LanguageVariant,
  type Node,
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
} from "typescript";

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
  const source = createSourceFile(
    "source.tsx",
    code,
    ScriptTarget.Latest,
    false,
    ScriptKind.TSX,
  );
  const literals: Range[] = [];
  const visit = (node: Node) => {
    if (
      isRegularExpressionLiteral(node) ||
      isStringLiteral(node) ||
      isTemplateLiteralToken(node) ||
      isJsxText(node)
    ) {
      literals.push({
        from: isJsxText(node) ? node.pos : node.getStart(source),
        to: node.end,
      });
    } else {
      node.forEachChild(visit);
    }
  };

  visit(source);

  // The parser resolves regex/division, template interpolation and JSX text.
  // Scan the remaining source, including incomplete code, for comment trivia.
  const scanner = createScanner(
    ScriptTarget.Latest,
    false,
    LanguageVariant.JSX,
    code,
  );
  const comments: Range[] = [];
  let literalIndex = 0;
  for (
    let token = scanner.scan();
    token !== SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    const from = scanner.getTokenPos();
    while (
      literalIndex < literals.length &&
      literals[literalIndex].to <= from
    ) {
      literalIndex++;
    }

    const literal = literals[literalIndex];
    if (literal && literal.from <= from) {
      scanner.setTextPos(literal.to);
    } else if (
      token === SyntaxKind.SingleLineCommentTrivia ||
      token === SyntaxKind.MultiLineCommentTrivia
    ) {
      comments.push({ from, to: scanner.getTextPos() });
    }
  }

  return removeRanges(code, comments, true);
}
