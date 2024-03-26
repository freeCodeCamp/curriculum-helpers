import cssTestValues from "../__fixtures__/curriculum-helper-css";
import htmlTestValues from "../__fixtures__/curriculum-helpers-html";
import jsTestValues from "../__fixtures__/curriculum-helpers-javascript";
import whiteSpaceTestValues from "../__fixtures__/curriculum-helpers-remove-white-space";
import * as helper from "../index";

const { stringWithWhiteSpaceChars, stringWithWhiteSpaceCharsRemoved } =
  whiteSpaceTestValues;

const { cssFullExample, cssCodeWithCommentsRemoved } = cssTestValues;

const { htmlFullExample, htmlCodeWithCommentsRemoved } = htmlTestValues;

const {
  jsCodeWithSingleAndMultLineComments,
  jsCodeWithSingleAndMultLineCommentsRemoved,
  jsCodeWithUrl,
  jsCodeWithUrlUnchanged,
  jsCodeWithNoCall,
  jsCodeWithNoArgCall,
  jsCodeWithArgCall,
  jsCodeWithCommentedCall,
} = jsTestValues;

describe("removeWhiteSpace", () => {
  const { removeWhiteSpace } = helper;
  it("returns a string", () => {
    expect(typeof removeWhiteSpace("This should return a string")).toBe(
      "string"
    );
  });

  it("returns a string with no white space characters", () => {
    expect(removeWhiteSpace(stringWithWhiteSpaceChars)).toBe(
      stringWithWhiteSpaceCharsRemoved
    );
  });
});

describe("removeJSComments", () => {
  const { removeJSComments } = helper;
  it("returns a string", () => {
    expect(typeof removeJSComments('const should = "return a string"')).toBe(
      "string"
    );
  });

  it("returns a string with no single or multi-line comments", () => {
    expect(removeJSComments(jsCodeWithSingleAndMultLineComments)).toBe(
      jsCodeWithSingleAndMultLineCommentsRemoved
    );
  });

  it("leaves malformed JS unchanged", () => {
    const actual = "/ unclosed regex";
    expect(removeJSComments(actual)).toBe(actual);
  });

  it("does not remove a url found in JS code", () => {
    expect(removeJSComments(jsCodeWithUrl)).toBe(jsCodeWithUrlUnchanged);
  });
});

describe("removeCssComments", () => {
  const { removeCssComments } = helper;
  it("returns a string", () => {
    expect(typeof removeCssComments(".aClass: { color: red; }")).toBe("string");
  });

  it("returns a CSS string with no single or multi-line comments", () => {
    expect(removeCssComments(cssFullExample)).toBe(cssCodeWithCommentsRemoved);
  });
});

describe("removeHtmlComments", () => {
  const { removeHtmlComments } = helper;
  it("returns a string", () => {
    expect(
      typeof removeHtmlComments(
        "<h1>hello world</h1><!-- a comment--><h2>h2 element</h2>"
      )
    ).toBe("string");
  });

  it("returns an HTML string with no single or multi-line comments", () => {
    expect(removeHtmlComments(htmlFullExample)).toBe(
      htmlCodeWithCommentsRemoved
    );
  });
});

describe("isCalledWithNoArgs", () => {
  const { isCalledWithNoArgs } = helper;
  it("returns a boolean", () => {
    expect(typeof isCalledWithNoArgs("foo", "bar")).toBe("boolean");
  });
  it("returns false when not called", () => {
    expect(isCalledWithNoArgs("myFunc", jsCodeWithNoCall)).toBe(false);
  });
  it("returns true for a call with no arguments", () => {
    expect(isCalledWithNoArgs("myFunc", jsCodeWithNoArgCall)).toBe(true);
  });
  it("returns false for a call with arguments", () => {
    expect(isCalledWithNoArgs("myFunc", jsCodeWithArgCall)).toBe(false);
  });
  it("returns false for a commented out call", () => {
    expect(isCalledWithNoArgs("myFunc", jsCodeWithCommentedCall)).toBe(false);
  });
});

describe("concatRegex", () => {
  it("returns a Regex", () => {
    const { concatRegex } = helper;
    expect(concatRegex(/a/, /b/)).toBeInstanceOf(RegExp);
    expect(concatRegex(/a/, "b")).toBeInstanceOf(RegExp);
  });

  it("returns a compiled regex, when given a string or regex", () => {
    const { concatRegex } = helper;

    expect(concatRegex("ab").source).toBe("ab");
    expect(concatRegex(/\s/).source).toBe("\\s");
  });

  it("concatenates two regexes", () => {
    const { concatRegex } = helper;
    const regEx = concatRegex(/.*/, /b\s/);
    expect(regEx.source).toBe(".*b\\s");
  });
});

describe("permutateRegex", () => {
  it("returns a Regex", () => {
    const { permutateRegex } = helper;

    expect(permutateRegex([/a/, /b/])).toBeInstanceOf(RegExp);
    expect(permutateRegex([/a/, "b"])).toBeInstanceOf(RegExp);
    expect(permutateRegex(["a", "b"])).toBeInstanceOf(RegExp);
  });

  it("returns regex matching all permutations", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex(["a", "b", /c/]);

    expect(regex.test("a||b||c")).toBe(true);
    expect(regex.test("a||c||b")).toBe(true);
    expect(regex.test("b||a||c")).toBe(true);
    expect(regex.test("b||c||a")).toBe(true);
    expect(regex.test("c||a||b")).toBe(true);
    expect(regex.test("c||b||a")).toBe(true);
    expect(regex.source).not.toEqual("(?:)");
  });

  it("returns regex not matching invalid permutation", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex(["a", "b", "c"]);

    expect(regex.test("")).toBe(false);
    expect(regex.test("a")).toBe(false);
    expect(regex.test("a||a")).toBe(false);
    expect(regex.test("a||a||a")).toBe(false);
    expect(regex.test("b")).toBe(false);
    expect(regex.test("b||b")).toBe(false);
    expect(regex.test("b||b||b")).toBe(false);
    expect(regex.test("c")).toBe(false);
    expect(regex.test("c||c")).toBe(false);
    expect(regex.test("c||c||c")).toBe(false);
    expect(regex.test("a||b")).toBe(false);
    expect(regex.test("a||b||a")).toBe(false);
    expect(regex.test("a||b||b")).toBe(false);
  });

  it("returns regex using custom elementsSeparator", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex(["a", "b", "c"], { elementsSeparator: "," });

    expect(regex.test("a,b,c")).toBe(true);
    expect(regex.test("a,c,b")).toBe(true);
    expect(regex.test("b,a,c")).toBe(true);
    expect(regex.test("b,c,a")).toBe(true);
    expect(regex.test("c,a,b")).toBe(true);
    expect(regex.test("c,b,a")).toBe(true);
  });

  it("returns capturing regex when capture option is true", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex(["a", "b", "c"], { capture: true });

    console.log(regex);

    expect("b||c||a".match(regex)?.length).toEqual(2);
    expect("b||c||a".match(regex)?.[1]).toEqual("b||c||a");
  });

  it("returns not capturing regex when capture option is false", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex(["a", "b", "c"], { capture: false });

    expect("b||c||a".match(regex)?.length).toEqual(1);
  });
});
