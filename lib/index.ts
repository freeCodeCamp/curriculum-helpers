import { strip } from "./strip";

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
  callingCode: string
): boolean {
  const noCommentsCallingCode = strip(callingCode);
  const funcExp = `^\\s*?${escapeRegExp(calledFuncName)}\\(\\s*?\\)`;
  const matches = new RegExp(funcExp, "gm").exec(noCommentsCallingCode) ?? [];
  return Boolean(matches.length);
}

export interface ExtendedStyleRule extends CSSStyleRule {
  isDeclaredAfter: (selector: string) => boolean;
}
interface ExtendedStyleDeclaration extends CSSStyleDeclaration {
  getPropVal: (prop: string, strip?: boolean) => string;
}

const getIsDeclaredAfter = (styleRule: CSSStyleRule) => (selector: string) => {
  const cssStyleRules = Array.from(
    styleRule.parentStyleSheet?.cssRules || []
  )?.filter((ele) => ele.type === CSSRule.STYLE_RULE) as CSSStyleRule[];
  const previousStyleRule = cssStyleRules.find(
    (ele) => ele?.selectorText === selector
  );
  if (!previousStyleRule) return false;
  const currPosition = Array.from(
    styleRule.parentStyleSheet?.cssRules || []
  ).indexOf(styleRule);
  const prevPosition = Array.from(
    previousStyleRule?.parentStyleSheet?.cssRules || []
  ).indexOf(previousStyleRule);
  return currPosition > prevPosition;
};

export module python {
  export function getDef(code: string, functionName: string) {
    const regex = new RegExp(
      `\\n?(?<function_indentation> *?)def +${functionName} *\\((?<function_parameters>[^\\)]*)\\)\\s*: *?\\n(?<function_body> +.*?)(?=\\n\\k<function_indentation>[\\w#]|$)`,
      "s"
    );

    const matchedCode = regex.exec(code);
    if (matchedCode) {
      const { function_parameters, function_body, function_indentation } =
        matchedCode.groups;

      const functionIndentationSansNewLine = function_indentation.replace(
        /\n+/,
        ""
      );
      return {
        // Entire function definition without additional \n
        def: matchedCode[0].slice(1),
        function_parameters,
        function_body,
        function_indentation: functionIndentationSansNewLine.length,
      };
    }

    return null;
  }

  export function removeComments(code: string) {
    return code.replace(/\/\/.*|\/\*[\s\S]*?\*\/|(#.*$)/gm, "");
  }

  /**
   * Gets a Python block of code matching the `blockPattern`
   * @param code - Code string to search
   * @param blockPattern - String or regular expression to match on the block condition
   *
   * **Note:** A string `blockPattern` will be escaped to prevent special characters from being treated as regular expression syntax.
   */
  export function getBlock(code: string, blockPattern: string | RegExp) {
    const escapedBlockPattern =
      blockPattern instanceof RegExp
        ? blockPattern.source
        : blockPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `\\n?(?<block_indentation> *?)(?<block_condition>${escapedBlockPattern})\\s*: *?\\n(?<block_body> +.*?)(?=\\n\\k<block_indentation>[\\w#]|$)`,
      "s"
    );

    const matchedCode = regex.exec(code);
    if (matchedCode) {
      /* eslint-disable camelcase */
      const { block_body, block_indentation, block_condition } =
        matchedCode.groups;

      const blockIndentationSansNewLine = block_indentation.replace(/\n+/g, "");
      return {
        block_body,
        block_condition,
        block_indentation: blockIndentationSansNewLine.length,
      };
      /* eslint-enable camelcase */
    }

    return null;
  }
}

export { astHelpers } from "../python/index.js";
export class CSSHelp {
  doc: Document;
  constructor(doc: Document) {
    this.doc = doc;
  }

  private _getStyleRules() {
    const styleSheet = this.getStyleSheet();
    return this.styleSheetToCssRulesArray(styleSheet).filter(
      (ele) => ele.type === CSSRule.STYLE_RULE
    ) as CSSStyleRule[];
  }

  getStyleDeclarations(selector: string): CSSStyleDeclaration[] {
    return this._getStyleRules()
      ?.filter((ele) => ele?.selectorText === selector)
      .map((x) => x.style);
  }

  getStyle(selector: string): ExtendedStyleDeclaration | null {
    const style = this._getStyleRules().find(
      (ele) => ele?.selectorText === selector
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
      (ele) => ele?.selectorText === selector
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
      ele.style?.getPropertyValue(property)
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
      "link[href*='styles']"
    );

    // When using the styles.css tab, we add a 'fcc-injected-styles' class so we can target that. This allows users to add external scripts without them interfering
    const stylesDotCss: HTMLStyleElement | null = this.doc?.querySelector(
      "style.fcc-injected-styles"
    );

    // For steps that use <style> tags, where they don't add the above class - most* browser extensions inject styles with class/media attributes, so it filters those
    const styleTag: HTMLStyleElement | null = this.doc?.querySelector(
      "style:not([class]):not([media])"
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
    styleSheet: ReturnType<CSSHelp["getStyleSheet"]>
  ): CSSRule[] {
    return Array.from(styleSheet?.cssRules || []);
  }

  // Takes a CSS selector, returns all equivelant selectors from the current document
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
