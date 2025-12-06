import { strict as assert } from "assert";
import * as helpers from "../lib";

describe("getStyleAny selector validation", function () {
  it("should not match invalid selectors (no partial matching)", function () {
    const css = `
span[class~="one"] *:first-of-type {
  background-image: linear-gradient(#f93, #f93);
  border-color: #d61;
}
span[class~="two"] *:nth-of-type(-n + 2) {
  background-image: linear-gradient(#f93, #f93);
  border-color: #d61;
}
`;

    const allowed = [
      'span[class~="one"] > :first-child',
      'span[class~="two"] > :first-child'
    ];

    const result = (helpers as any).getStyleAny
      ? (helpers as any).getStyleAny(css, allowed)
      : (helpers as any).default?.getStyleAny?.(css, allowed);

    assert.equal(
      result,
      false,
      "getStyleAny incorrectly matched invalid selectors (should not partial-match)."
    );
  });

  it("should match when the selector exactly appears in CSS", function () {
    const css = `
div.foo {
  color: red;
}
`;

    const allowed = ["div.foo"];

    const result = (helpers as any).getStyleAny
      ? (helpers as any).getStyleAny(css, allowed)
      : (helpers as any).default?.getStyleAny?.(css, allowed);

    assert.equal(result, true, "getStyleAny should return true for exact selector match.");
  });
});
