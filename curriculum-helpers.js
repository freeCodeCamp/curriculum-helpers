
import CSSHelp  from "./css-helpers";
const removeHtmlComments = (str) => str.replace(/<!--[\s\S]*?(-->|$)/g, "");

const removeCssComments = (str) => str.replace(/\/\*[\s\S]+?\*\//g, "");

export const removeJSComments = (codeStr) => {
  // TODO: publish type declarations and re-enable eslint
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return strip(codeStr);
  } catch (err) {
    return codeStr;
  }
};

const removeWhiteSpace = (str = "") => {
  return str.replace(/\s/g, "");
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(exp) {
  return exp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/*
This helper checks if a function/method is called with no arguments.

Because Safari does not support lookbehinds (as of writing this on
July 14 2021), avoiding false matches on function definitions is done by
checking that only whitespace characters precede the calling name on the line
it is found on. That makes this helper incompatible with
removeWhiteSpace() above, which removes all whitespace characters.
*/

function isCalledWithNoArgs(calledFuncName, callingCode) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const noCommentsCallingCode = strip(callingCode);
  const funcExp = `^\\s*?${escapeRegExp(calledFuncName)}\\(\\s*?\\)`;
  const matches = new RegExp(funcExp, "gm").exec(noCommentsCallingCode) ?? [];

  return !!matches.length;
}

const curriculumHelpers = {
  removeHtmlComments,
  removeCssComments,
  removeWhiteSpace,
  isCalledWithNoArgs,
  CSSHelp,
};
