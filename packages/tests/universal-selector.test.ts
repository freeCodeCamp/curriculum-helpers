// Testcase for testing whether it is allowing universal selectors implicitly
import { CSSHelp } from "../helpers/lib/index";
import type { Document } from "domhandler";

// 1. Use @ts-expect-error and explain why (required by some linter configs)
// @ts-expect-error - Global CSSRule does not exist in Node environment
global.CSSRule = { STYLE_RULE: 1 };

describe("Universal Selector Test", () => {
  /**
   * 2. Removed the unused 'html' string variable.
   * Since we are mocking the querySelector return value directly,
   * the raw string isn't needed by the compiler.
   */

  const mockDoc = {
    querySelector(selector: string) {
      if (selector === "style.fcc-injected-styles") {
        return {
          sheet: {
            cssRules: [
              {
                type: 1, // CSSRule.STYLE_RULE
                selectorText: 'span[class~="one"] *:first-of-type',
                style: {
                  getPropertyValue(prop: string) {
                    if (prop === "background-image")
                      return "linear-gradient(#f93, #f93)";
                    if (prop === "border-color") return "#d61";
                    return "";
                  },
                },
              },
            ],
          },
        };
      }

      return null;
    },
  } as unknown as Document;

  const cssHelp = new CSSHelp(mockDoc);

  test("should find the universal selector style", () => {
    const style = cssHelp.getStyle('span[class~="one"] *:first-of-type');

    expect(style).not.toBeNull();
    // GetPropVal is a custom method added by CSSHelp.getStyle
    expect(style?.getPropVal("border-color")).toBe("#d61");
  });

  test("should return null for non-existent selectors", () => {
    const style = cssHelp.getStyle("div.wrong-selector");
    expect(style).toBeNull();
  });
});
