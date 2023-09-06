import { strip } from "./strip.js";
import { Babeliser } from "babeliser";
import { CSSHelp } from "./css-help/index.js";

export { Babeliser, CSSHelp };

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
