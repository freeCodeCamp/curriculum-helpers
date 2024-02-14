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

describe("functionRegex", () => {
  const { functionRegex } = helper;
  it("returns a regex", () => {
    expect(functionRegex("myFunc")).toBeInstanceOf(RegExp);
  });

  it("matches the named function", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName));
    expect(regEx.test("function myFunc(){}")).toBe(true);
  });

  it("does not match a different named function", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName));
    expect(regEx.test("function notMyFunc(){}")).toBe(false);
  });

  it("matches the named function with arguments and a body", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName, ["arg1", "arg2"]));
    expect(regEx.test("function myFunc(arg1, arg2){\n console.log()\n}")).toBe(
      true
    );
  });

  it("does not match the named function with different arguments", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName, ["arg1", "arg2"]));
    expect(regEx.test("function myFunc(arg1, arg3){}")).toBe(false);
  });

  it("matches arrow functions", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName, ["arg1", "arg2"]));
    expect(regEx.test("myFunc = (arg1, arg2) => {}")).toBe(true);
  });

  it("matches arrow functions without brackets", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName, ["arg1"]));
    expect(regEx.test("myFunc = arg1 => arg1 + 1")).toBe(true);
  });

  it("matches a function with a special character in the name", () => {
    const funcName = "myFunc$";
    const regEx = new RegExp(functionRegex(funcName));
    expect(regEx.test("function myFunc$(){}")).toBe(true);
  });

  it("matches anonymous functions", () => {
    const regEx = new RegExp(functionRegex(null, ["arg1", "arg2"]));
    expect(regEx.test("function(arg1, arg2) {}")).toBe(true);
  });

  it("matches anonymous arrow functions", () => {
    const regEx = new RegExp(functionRegex(null, ["arg1", "arg2"]));
    expect(regEx.test("(arg1, arg2) => {}")).toBe(true);
  });

  it("ignores irrelevant whitespace", () => {
    const funcName = "myFunc";
    const regEx = new RegExp(functionRegex(funcName, ["arg1", "arg2"]));
    expect(regEx.test("function \n\n myFunc \n ( arg1 , arg2 ) \n{ }")).toBe(
      true
    );
  });
});
