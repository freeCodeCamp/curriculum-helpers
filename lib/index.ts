import { strip } from "./strip";
import astHelpers from "../python/py_helpers.py";
export { Tower, generate } from "./class/tower";
export { Babeliser } from "./class/babeliser";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

/**
 * The `RandomMocker` class provides functionality to mock and restore the global `Math.random` function.
 * It replaces the default random number generator with a deterministic pseudo-random number generator.
 */
export class RandomMocker {
  private random: () => number;

  constructor() {
    this.random = Math.random;
  }

  private createRandom() {
    let seed = 42;
    const a = 1664525;
    const c = 1013904223;
    const mod = 2 ** 32;
    return () => {
      seed = (a * seed + c) % mod;
      return seed / mod;
    };
  }

  mock(): void {
    globalThis.Math.random = this.createRandom();
  }

  restore(): void {
    globalThis.Math.random = this.random;
  }
}

/** Calling spyOn creates a simple spy, inspired by Jest and Jasmine's spyOn functions.
 * @param obj - The object to spy on
 * @param method - The method to spy on
 * @returns A spy function that can be used to track calls to the original method
 */
export function spyOn<Args extends unknown[], Return>(
  obj: Record<string, (...args: Args) => Return>,
  method: string,
): {
  restore: () => void;
  calls: Args[];
  returns: Return[];
} {
  const original = obj[method];
  const calls: Args[] = [];
  const results: Return[] = [];

  const fn = (...args: Args) => {
    calls.push(args);
    const result = original(...args);
    results.push(result);
    return result;
  };

  obj[method] = fn;

  fn.calls = calls;
  fn.returns = results;
  fn.restore = () => {
    obj[method] = original;
  };

  return fn;
}

/**
 * Removes every HTML-comment from the string that is provided
 * @param {String} str a HTML-string where the comments need to be removed of
 * @returns {String}
 */

export function removeHtmlComments(str: string): string {
  return str.replace(/<!--[\s\S]*?(-->|$)/g, "");
}

/**
 * Removes every CSS-comment from the string that is provided
 * @param {String} str a CSS-string where the comments need to be removed of
 * @returns {String}
 */

export function removeCssComments(str: string): string {
  return str.replace(/\/\*[\s\S]+?\*\//g, "");
}

/**
 * Removes every JS-comment from the string that is provided
 * @param {String} codeStr a JS-string where the comments need to be removed of
 * @returns {String}
 */

export function removeJSComments(codeStr: string): string {
  // TODO: publish type declarations and re-enable eslint
  try {
    return strip(codeStr);
  } catch (err) {
    return codeStr;
  }
}

/**
 * Removes every white-space from the string that is provided
 * @param {String} str a String where the white spaces need to be removed of
 * @returns {String}
 */

export function removeWhiteSpace(str: string): string {
  return str.replace(/\s/g, "");
}

/**
 * This function helps to escape RegEx patterns
 * @param {String} exp
 * @returns {String}
 */

export function escapeRegExp(exp: string): string {
  return exp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * This helper checks if a function/method is called with no arguments
 * @param {String} calledFuncName
 * @param {String} callingCode
 * @returns {Boolean}
 */

export function isCalledWithNoArgs(
  calledFuncName: string,
  callingCode: string,
): boolean {
  const noCommentsCallingCode = strip(callingCode);
  const funcExp = `^\\s*?${escapeRegExp(calledFuncName)}\\(\\s*?\\)`;
  const matches = new RegExp(funcExp, "gm").exec(noCommentsCallingCode) ?? [];
  return Boolean(matches.length);
}

/**
 * Concatenates multiple regexes or source strings into a single regex.
 * @param regexes
 * @returns
 */

export function concatRegex(...regexes: (string | RegExp)[]) {
  const source = regexes.map((r) => new RegExp(r).source).join("");
  return new RegExp(source);
}

/**
 * Generates a regex string to match a function expressions and declarations
 * @param funcName - The name of the function to be matched
 * @param paramList - Optional list of parameters to be matched
 * @param options - Optional object determining whether to capture the match
 * (defaults to non-capturing) and whether to include the body in the match (defaults
 * to true)
 */

export function functionRegex(
  funcName: string | null,
  paramList?: string[] | null,
  options?: { capture?: boolean; includeBody?: boolean },
): RegExp {
  const capture = options?.capture ?? false;
  const includeBody = options?.includeBody ?? true;
  const params = paramList ? paramList.join("\\s*,\\s*") : "[^)]*";

  const normalFunctionName = funcName ? "\\s" + escapeRegExp(funcName) : "";
  const arrowFunctionName = funcName
    ? `(let|const|var)?\\s?${escapeRegExp(funcName)}\\s*=\\s*`
    : "";
  const body = "[^}]*";

  const funcREHead = `function\\s*${normalFunctionName}\\s*\\(\\s*${params}\\s*\\)\\s*\\{`;
  const funcREBody = `${body}\\}`;
  const funcRegEx = includeBody
    ? `${funcREHead}${funcREBody}`
    : `${funcREHead}`;

  const arrowFuncREHead = `${arrowFunctionName}\\(?\\s*${params}\\s*\\)?\\s*=>\\s*\\{?`;
  const arrowFuncREBody = `${body}\\}?`;
  const arrowFuncRegEx = includeBody
    ? `${arrowFuncREHead}${arrowFuncREBody}`
    : `${arrowFuncREHead}`;
  return new RegExp(`(${capture ? "" : "?:"}${funcRegEx}|${arrowFuncRegEx})`);
}

function _permutations(permutation: (string | RegExp)[]) {
  const permutations: (string | RegExp)[][] = [];

  // Heap's algorithm
  function permute(array: (string | RegExp)[], length: number) {
    if (length === 1) {
      permutations.push(array.slice());
      return;
    }

    for (let i = 0; i < length; i++) {
      permute(array, length - 1);
      if (length % 2 === 1) {
        [array[0], array[length - 1]] = [array[length - 1], array[0]];
      } else {
        [array[i], array[length - 1]] = [array[length - 1], array[i]];
      }
    }
  }

  permute(permutation, permutation.length);
  return permutations;
}

const reCaptureGroupName = /\(\?<([\w\d]+)>/g;
const reBackreferenceGroupName = /\\k<([\w\d]+)>/g;

/**
 * Creates regex matching regular expressions or source strings in any order.
 * Both names and backreferences of the capturing named groups
 * will be renamed, to avoid duplicated group names, and to allow
 * backreferences to refer to correct group.
 * @param {(string | RegExp)[]} regexes
 * @param {Object} [options]
 * @param {boolean} [options.capture=false] If `true`, returned regex will be capturing. Defaults to `false`.
 * @param {string} [options.elementsSeparator=String.raw`\s*\|\|\s*`] Separator added between individual regexes within single permutation. Defaults to `\s*\|\|\s*`.
 * @param {string} [options.permutationsSeparator='|'] Separator added between different permutations. Defaults to `|`.
 * @returns {RegExp}
 */

export function permutateRegex(
  regexes: (string | RegExp)[],
  {
    capture = false,
    elementsSeparator = String.raw`\s*\|\|\s*`,
    permutationsSeparator = "|",
  }: {
    capture?: boolean;
    elementsSeparator?: string;
    permutationsSeparator?: string;
  } = {},
): RegExp {
  const permutations = _permutations(regexes.map((r) => new RegExp(r).source));
  const source = permutations
    .map((p, index) =>
      p
        .join(elementsSeparator)
        .replace(reCaptureGroupName, String.raw`(?<$1_${index}>`)
        .replace(reBackreferenceGroupName, String.raw`\k<$1_${index}>`),
    )
    .join(permutationsSeparator);

  return new RegExp(`(${capture ? "" : "?:"}${source})`);
}

export interface ExtendedStyleRule extends CSSStyleRule {
  isDeclaredAfter: (selector: string) => boolean;
}
interface ExtendedStyleDeclaration extends CSSStyleDeclaration {
  getPropVal: (prop: string, strip?: boolean) => string;
}

const getIsDeclaredAfter = (styleRule: CSSStyleRule) => (selector: string) => {
  const cssStyleRules = Array.from(
    styleRule.parentStyleSheet?.cssRules || [],
  )?.filter((ele) => ele.type === CSSRule.STYLE_RULE) as CSSStyleRule[];
  const previousStyleRule = cssStyleRules.find(
    (ele) => ele?.selectorText === selector,
  );
  if (!previousStyleRule) return false;
  const currPosition = Array.from(
    styleRule.parentStyleSheet?.cssRules || [],
  ).indexOf(styleRule);
  const prevPosition = Array.from(
    previousStyleRule?.parentStyleSheet?.cssRules || [],
  ).indexOf(previousStyleRule);
  return currPosition > prevPosition;
};

export async function prepTestComponent(
  component: unknown,
  props?: Record<string, unknown>,
) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const testDiv = document.createElement("div");
  // @ts-expect-error the React version is determined at runtime so we can't define the types here
  const createdElement = globalThis.React?.createElement(component, props);

  // @ts-expect-error or here
  await globalThis.React?.act(async () => {
    // @ts-expect-error Same for ReactDOM as for React
    globalThis.ReactDOM?.createRoot(testDiv).render(createdElement);
  });
  return testDiv;
}

export const python = {
  astHelpers,
  getDef(code: string, functionName: string) {
    const regex = new RegExp(
      `\\n?(?<function_indentation> *?)def +${functionName} *\\((?<function_parameters>[^\\)]*)\\)\\s*:\\s*?\\n?(?<function_body>.*?)(?=\\n\\k<function_indentation>[\\w#]|$)`,
      "s",
    );

    const matchedCode = regex.exec(code);
    if (matchedCode) {
      const { function_parameters, function_body, function_indentation } =
        matchedCode.groups as {
          function_parameters: string;
          function_body: string;
          function_indentation: string;
        };

      const functionIndentationSansNewLine = function_indentation.replace(
        /\n+/,
        "",
      );
      return {
        // Entire function definition without leading \n
        def: matchedCode[0].replace(/^\n/, ""),
        function_parameters,
        function_body,
        function_indentation: functionIndentationSansNewLine.length,
      };
    }

    return null;
  },

  removeComments(code: string) {
    return code.replace(/\/\/.*|\/\*[\s\S]*?\*\/|(#.*$)/gm, "");
  },

  /**
   * Gets a Python block of code matching the `blockPattern`
   * @param code - Code string to search
   * @param blockPattern - String or regular expression to match on the block condition
   *
   * **Note:** A string `blockPattern` will be escaped to prevent special characters from being treated as regular expression syntax.
   */
  getBlock(code: string, blockPattern: string | RegExp) {
    const escapedBlockPattern =
      blockPattern instanceof RegExp
        ? blockPattern.source
        : blockPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `\\n?(?<block_indentation> *?)(?<block_condition>${escapedBlockPattern})\\s*:\\s*?\\n(?<block_body>(\\k<block_indentation> +[^\\n]*| *\\n)+)(\n|$)`,
      "sm",
    );

    const matchedCode = regex.exec(code);
    if (matchedCode) {
      /* eslint-disable camelcase */
      const { block_body, block_indentation, block_condition } =
        matchedCode.groups as {
          block_body: string;
          block_indentation: string;
          block_condition: string;
        };

      const blockIndentationSansNewLine = block_indentation.replace(/\n+/g, "");
      return {
        block_body,
        block_condition,
        block_indentation: blockIndentationSansNewLine.length,
      };
      /* eslint-enable camelcase */
    }

    return null;
  },
};

export class CSSHelp {
  doc: Document;
  constructor(doc: Document) {
    this.doc = doc;
  }

  private _getStyleRules() {
    const styleSheet = this.getStyleSheet();
    return this.styleSheetToCssRulesArray(styleSheet).filter(
      (ele) => ele.type === CSSRule.STYLE_RULE,
    ) as CSSStyleRule[];
  }

  getStyleDeclarations(selector: string): CSSStyleDeclaration[] {
    return this._getStyleRules()
      ?.filter((ele) => ele?.selectorText === selector)
      .map((x) => x.style);
  }

  getStyle(selector: string): ExtendedStyleDeclaration | null {
    const style = this._getStyleRules().find(
      (ele) => ele?.selectorText === selector,
    )?.style as ExtendedStyleDeclaration | undefined;
    if (!style) return null;
    style.getPropVal = (prop: string, strip = false) => {
      return strip
        ? style.getPropertyValue(prop).replace(/\s+/g, "")
        : style.getPropertyValue(prop);
    };

    return style;
  }

  // A wrapper around getStyle for testing challenges where multiple CSS selectors are valid
  getStyleAny(selectors: string[]): ExtendedStyleDeclaration | null {
    for (const selector of selectors) {
      const style = this.getStyle(selector);

      if (style) {
        return style;
      }
    }

    return null;
  }

  getStyleRule(selector: string): ExtendedStyleRule | null {
    const styleRule = this._getStyleRules()?.find(
      (ele) => ele?.selectorText === selector,
    );
    if (styleRule) {
      return {
        ...styleRule,
        isDeclaredAfter: (selector: string) =>
          getIsDeclaredAfter(styleRule)(selector),
      };
    }

    return null;
  }

  getCSSRules(element?: string): CSSRule[] {
    const styleSheet = this.getStyleSheet();
    const cssRules = this.styleSheetToCssRulesArray(styleSheet);
    switch (element) {
      case "media":
        return cssRules.filter((ele) => ele.type === CSSRule.MEDIA_RULE);
      case "fontface":
        return cssRules.filter((ele) => ele.type === CSSRule.FONT_FACE_RULE);
      case "import":
        return cssRules.filter((ele) => ele.type === CSSRule.IMPORT_RULE);
      case "keyframes":
        return cssRules.filter((ele) => ele.type === CSSRule.KEYFRAMES_RULE);
      default:
        return cssRules;
    }
  }

  isPropertyUsed(property: string): boolean {
    return this._getStyleRules().some((ele) =>
      ele.style?.getPropertyValue(property),
    );
  }

  getRuleListsWithinMedia(mediaText: string): CSSStyleRule[] {
    const medias = this.getCSSRules("media") as CSSMediaRule[];
    const cond = medias?.find((x) => x?.media?.mediaText === mediaText);
    const cssRules = cond?.cssRules;
    return Array.from(cssRules || []) as CSSStyleRule[];
  }

  getStyleSheet(): CSSStyleSheet | null {
    // TODO: Change selector to match exactly 'styles.css'
    const link: HTMLLinkElement | null = this.doc?.querySelector(
      "link[href*='styles']",
    );

    // When using the styles.css tab, we add a 'fcc-injected-styles' class so we can target that. This allows users to add external scripts without them interfering
    const stylesDotCss: HTMLStyleElement | null = this.doc?.querySelector(
      "style.fcc-injected-styles",
    );

    // For steps that use <style> tags, where they don't add the above class - most* browser extensions inject styles with class/media attributes, so it filters those
    const styleTag: HTMLStyleElement | null = this.doc?.querySelector(
      "style:not([class]):not([media])",
    );

    if (link?.sheet?.cssRules?.length) {
      return link.sheet;
    }

    if (stylesDotCss) {
      return stylesDotCss.sheet;
    }

    if (styleTag) {
      return styleTag.sheet;
    }

    return null;
  }

  styleSheetToCssRulesArray(
    styleSheet: ReturnType<CSSHelp["getStyleSheet"]>,
  ): CSSRule[] {
    return Array.from(styleSheet?.cssRules || []);
  }

  // Takes a CSS selector, returns all equivalent selectors from the current document
  // or an empty array if there are no matches
  selectorsFromSelector(selector: string): string[] {
    const elements = this.doc.querySelectorAll(selector);
    const allSelectors = Array.from(elements)
      .map((element: Element) => {
        const directPath = [];
        const indirectPath = [];
        const allPaths = [];

        while (element.parentNode) {
          let tag = element.tagName.toLowerCase();
          const siblings = Array.from(element.parentNode.children);

          if (
            siblings.filter((e) => e.tagName === element.tagName).length > 1
          ) {
            const allSiblings = Array.from(element.parentNode.childNodes);
            const index = allSiblings.indexOf(element);
            tag += `:nth-child(${index + 1})`;
          }

          directPath.unshift(tag);
          indirectPath.unshift(tag);
          allPaths.push([directPath.join(" > "), indirectPath.join(" ")]);

          // Traverse up the DOM tree
          element = element.parentNode as Element;
        }

        return allPaths.flat();
      })
      .flat();

    // Remove duplicates
    return [...new Set(allSelectors)];
  }
}

/**
 * Extracts all function parameters and default values from a function
 * @param functionObject A function in string form
 * Note: All number parameters will returned as a string,
 * @returns {{name:string,defaultValue: string | undefined}}
 */
export function getFunctionParams(code: string) {
  // Regular expression to match function declarations, arrow functions, and function expressions
  const functionDeclareRegex = /(?:function\s*[^(]*\(([^)]*)\))/;

  const functionVariableRegex =
    /(?:\b(?:const|let|var)\s*\w+\s*=\s*(?:function)?\s*\(([^)]*)\))/;

  const arrowFunctionRegex = /=\s+([^)]*)=>/;

  // Match the function parameters
  const paramMatch =
    code.match(functionDeclareRegex) ||
    code.match(functionVariableRegex) ||
    code.match(arrowFunctionRegex);

  if (paramMatch) {
    // Find the captured group containing the parameters
    const paramString =
      paramMatch[1] || paramMatch[2] || paramMatch[3] || paramMatch[4];
    // Split the parameter string by commas to get individual parameters
    const params = paramString
      .replace(/[{}[\]]/g, "")
      .split(",")
      .map((param: string) => {
        // Split each parameter by '=' to separate name and default value
        const parts = param.trim().split(/[=]/);
        // If the parameter has a default value, extract it, otherwise set it to undefined
        const defaultValue =
          parts.length > 1 ? parts[1].replace(/['"]/g, "").trim() : undefined;

        // Return an object with the parameter name and default value
        return {
          name: parts[0].trim(),
          defaultValue: defaultValue,
        };
      });
    return params;
  }

  // Return an empty array if no function parameters are found
  return [];
}
