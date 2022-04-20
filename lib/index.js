"use strict";

const strip = require("@freecodecamp/strip-comments");

module.exports = {
  /**
   * Removes every HTML-comment from the string that is provided
   * @param {String} str a HTML-string where the comments need to be removed of
   * @returns {String}
   */

  removeHtmlComments: str => {
    return str.replace(/<!--[\s\S]*?(-->|$)/g, "");
  },

  /**
   * Removes every CSS-comment from the string that is provided
   * @param {String} str a CSS-string where the comments need to be removed of
   * @returns {String}
   */

  removeCssComments: str => {
    return str.replace(/\/\*[\s\S]+?\*\//g, "");
  },

  /**
   * Removes every white-space from the string that is provided
   * @param {String} str a String where the white spaces need to be removed of
   * @returns {String}
   */

  removeWhiteSpace: str => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  /**
   * This function helps to escape RegEx patterns
   * @param {String} exp
   * @returns {String}
   */

  escapeRegExp: exp => {
    return exp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  /**
   * This helper checks if a function/method is called with no arguments
   * @param {String} calledFuncName
   * @param {String} callingCode
   * @returns {Boolean}
   */

  isCalledWithNoArgs: (calledFuncName, callingCode) => {
    const noCommentsCallingCode = strip(callingCode);
    const funcExp = `^\\s*?${module.escapeRegExp(calledFuncName)}\\(\\s*?\\)`;
    const matches = new RegExp(funcExp, "gm").exec(noCommentsCallingCode) ?? [];
    return Boolean(matches.length);
  }
};
