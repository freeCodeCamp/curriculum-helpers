import React from "react";
import ReactDOM from "react-dom/client";

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

describe("RandomMocker", () => {
  let random: () => number;

  beforeEach(() => {
    random = Math.random;
  });

  afterEach(() => {
    Math.random = random;
  });

  describe("mock", () => {
    it('should replace "Math.random" with a mock function', () => {
      const mocker = new helper.RandomMocker();
      mocker.mock();
      expect(Math.random).not.toBe(random);
    });

    it('should mock "Math.random" with a pseudorandom function', () => {
      const mocker = new helper.RandomMocker();
      mocker.mock();
      // Predictable random values:
      expect(Math.random()).toBe(0.2523451747838408);
      expect(Math.random()).toBe(0.08812504541128874);
    });

    it("should reset the pseudorandom function when called multiple times", () => {
      const mocker = new helper.RandomMocker();
      mocker.mock();
      expect(Math.random()).toBe(0.2523451747838408);
      mocker.mock();
      expect(Math.random()).toBe(0.2523451747838408);
    });
  });

  describe("restore", () => {
    it('should restore "Math.random" to its original function', () => {
      const mocker = new helper.RandomMocker();
      mocker.mock();
      mocker.restore();
      expect(Math.random).toBe(random);
    });
  });
});

describe("removeWhiteSpace", () => {
  const { removeWhiteSpace } = helper;
  it("returns a string", () => {
    expect(typeof removeWhiteSpace("This should return a string")).toBe(
      "string",
    );
  });

  it("returns a string with no white space characters", () => {
    expect(removeWhiteSpace(stringWithWhiteSpaceChars)).toBe(
      stringWithWhiteSpaceCharsRemoved,
    );
  });
});

describe("removeJSComments", () => {
  const { removeJSComments } = helper;
  it("returns a string", () => {
    expect(typeof removeJSComments('const should = "return a string"')).toBe(
      "string",
    );
  });

  it("returns a string with no single or multi-line comments", () => {
    expect(removeJSComments(jsCodeWithSingleAndMultLineComments)).toBe(
      jsCodeWithSingleAndMultLineCommentsRemoved,
    );
  });

  it("handles nested comments", () => {
    const code = `/* this is a comment /* nested comment */ */`;
    expect(removeJSComments(code)).toBe("");
  });

  it('should ignore comments inside multiline template strings', () => {
    const expected = `const foo = \`// this is a comment
* me too */\`;
const bar = \`// this is a comment
/* me too */\`;
`;
    const actual = removeJSComments(expected);

    expect(actual).toBe(expected);
  })


  it('should handle comments that end in a slash', () => {
    const expected = `const bar = \`// this is a comment \\
\`;`;
    const actual = removeJSComments(expected);

    expect(actual).toBe(expected);
  })


  it('should strip comments with quotes', () => {
    const expected = '\nconst foo = "bar";\n';
    const actual = removeJSComments(`// this is a comment with "quotes"
const foo = "bar";
`);

    expect(actual).toBe(expected);
  })

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
        "<h1>hello world</h1><!-- a comment--><h2>h2 element</h2>",
      ),
    ).toBe("string");
  });

  it("returns an HTML string with no single or multi-line comments", () => {
    expect(removeHtmlComments(htmlFullExample)).toBe(
      htmlCodeWithCommentsRemoved,
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

describe("functionRegex", () => {
  const { functionRegex } = helper;
  it("returns a regex", () => {
    expect(functionRegex("myFunc")).toBeInstanceOf(RegExp);
  });

  it("matches the named function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName);
    expect(regEx.test("function myFunc(){}")).toBe(true);
  });

  it("does not match a different named function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName);
    expect(regEx.test("function notMyFunc(){}")).toBe(false);
  });

  it("matches the named function with arguments and a body", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"]);
    expect(regEx.test("function myFunc(arg1, arg2){\n console.log()\n}")).toBe(
      true,
    );
  });

  it("does not match the named function with different arguments", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"]);
    expect(regEx.test("function myFunc(arg1, arg3){}")).toBe(false);
  });

  it("matches arrow functions", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"]);
    expect(regEx.test("myFunc = (arg1, arg2) => {}")).toBe(true);
  });

  it("matches arrow functions without brackets", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1"]);
    expect(regEx.test("myFunc = arg1 => arg1 + 1")).toBe(true);
  });

  it("matches a function with a special character in the name", () => {
    const funcName = "myFunc$";
    const regEx = functionRegex(funcName);
    expect(regEx.test("function myFunc$(){}")).toBe(true);
  });

  it("matches anonymous functions", () => {
    const regEx = functionRegex(null, ["arg1", "arg2"]);
    expect(regEx.test("function(arg1, arg2) {}")).toBe(true);
  });

  it("matches anonymous arrow functions", () => {
    const regEx = functionRegex(null, ["arg1", "arg2"]);
    expect(regEx.test("(arg1, arg2) => {}")).toBe(true);
  });

  it("matches let or const declarations if they are present", () => {
    const regEx = functionRegex("myFunc", ["arg1", "arg2"]);
    const match = "let myFunc = (arg1, arg2) => {}".match(regEx);
    expect(match).not.toBeNull();
    expect(match![0]).toBe("let myFunc = (arg1, arg2) => {}");
  });

  it("ignores irrelevant whitespace", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"]);
    expect(regEx.test("function \n\n myFunc \n ( arg1 , arg2 ) \n{ }")).toBe(
      true,
    );
  });

  it("can optionally capture the function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"], { capture: true });
    const combinedRegEx = helper.concatRegex(/var x = 'y'; /, regEx);

    const match = "var x = 'y'; function myFunc(arg1, arg2){}".match(
      combinedRegEx,
    );
    expect(match).not.toBeNull();
    expect(match![0]).toBe("var x = 'y'; function myFunc(arg1, arg2){}");
    expect(match![1]).toBe("function myFunc(arg1, arg2){}");

    const nonCapturingRegEx = functionRegex(funcName, ["arg1", "arg2"]);

    const nonCapturingMatch = "function myFunc(arg1, arg2){}".match(
      nonCapturingRegEx,
    );
    expect(nonCapturingMatch).not.toBeNull();
    expect(nonCapturingMatch![1]).toBeUndefined();
  });

  it("can capture arrow functions", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"], { capture: true });

    const match = "myFunc = (arg1, arg2) => {return arg1 + arg2}".match(regEx);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("myFunc = (arg1, arg2) => {return arg1 + arg2}");
  });

  it("can capture functions without brackets", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1"], { capture: true });

    const match =
      "myFunc = arg1 => arg1; console.log()\n // captured, unfortunately".match(
        regEx,
      );
    expect(match).not.toBeNull();
    // It's a greedy match, since it doesn't know where the function ends.
    // This should be fine for most use cases.
    expect(match![1]).toBe(
      "myFunc = arg1 => arg1; console.log()\n // captured, unfortunately",
    );
  });

  it("can match just up to the opening bracket for an arrow function", () => {
    const code = `const naomi = (love) => {
  return love ** 2
}`;
    const startRE = functionRegex("naomi", ["love"], { includeBody: false });
    const endRE = /\s*return\s*love\s*\*\*\s*2\s*\}/;
    const fullRE = helper.concatRegex(startRE, endRE);

    expect(startRE.test(code)).toBe(true);
    expect(code.match(startRE)![0]).toBe("const naomi = (love) => {");

    expect(fullRE.test(code)).toBe(true);
    expect(code.match(fullRE)![0]).toBe(code);
  });

  it("can match just up to the opening bracket for a function declaration", () => {
    const code = `function naomi(love) {
  return love ** 2
}`;
    const startRE = functionRegex("naomi", ["love"], { includeBody: false });
    const endRE = /\s*return\s*love\s*\*\*\s*2\s\}/;
    const fullRE = helper.concatRegex(startRE, endRE);

    expect(startRE.test(code)).toBe(true);
    expect(code.match(startRE)![0]).toBe("function naomi(love) {");

    expect(fullRE.test(code)).toBe(true);
    expect(code.match(fullRE)![0]).toBe(code);
  });

  it("can optionally capture an open function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"], {
      capture: true,
      includeBody: false,
    });
    const combinedRegEx = helper.concatRegex(/var x = 'y'; /, regEx);

    const match = "var x = 'y'; function myFunc(arg1, arg2){return true}".match(
      combinedRegEx,
    );
    expect(match).not.toBeNull();
    expect(match![0]).toBe("var x = 'y'; function myFunc(arg1, arg2){");
    expect(match![1]).toBe("function myFunc(arg1, arg2){");
  });

  it("can optionally capture an open arrow function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"], {
      capture: true,
      includeBody: false,
    });
    const combinedRegEx = helper.concatRegex(/var x = 'y'; /, regEx);

    const match =
      "var x = 'y'; let myFunc = (arg1, arg2) => {return true}".match(
        combinedRegEx,
      );
    expect(match).not.toBeNull();
    expect(match![0]).toBe("var x = 'y'; let myFunc = (arg1, arg2) => {");
    expect(match![1]).toBe("let myFunc = (arg1, arg2) => {");
  });

  it("can match unnamed functions with unknown parameters", () => {
    const code = `function (manner, of, things) {}`;
    const funcRE = functionRegex(null);
    expect(funcRE.test(code)).toBe(true);
  });

  it("can match named functions with unknown parameters", () => {
    const code = `function all(manner, of, things) {}`;
    const funcRE = functionRegex("all");
    expect(funcRE.test(code)).toBe(true);
  });

  it("can match arrow functions with unknown parameters", () => {
    const code = `const all = (manner, of, things) => {}`;
    const funcRE = functionRegex("all");
    expect(funcRE.test(code)).toBe(true);
  });

  it("can match anonymous arrow functions with unknown parameters", () => {
    const code = `(manner, of, things) => {}`;
    const funcRE = functionRegex(null);
    expect(funcRE.test(code)).toBe(true);
  });

  it("ignores the body if there are no brackets and it's asked for the closed body", () => {
    const code = `const naomi = (love) => 2 * love;`;
    const funcRE = functionRegex("naomi", ["love"], {
      includeBody: false,
    });

    expect(funcRE.test(code)).toBe(true);
    expect(code.match(funcRE)![0]).toBe("const naomi = (love) => ");
  });
});

describe("prepTestComponent", () => {
  let MyComponent;
  beforeEach(() => {
    MyComponent = (props) => <main>{props.text}</main>;

    globalThis.React = React;
    globalThis.ReactDOM = ReactDOM;
  });

  afterEach(() => {
    delete globalThis.React;
    delete globalThis.ReactDOM;
    jest.restoreAllMocks();
  });

  it("should return an HTML element", async () => {
    const { prepTestComponent } = helper;

    const el = await prepTestComponent(MyComponent);

    expect(el).toBeInstanceOf(HTMLElement);
  });

  it("should render a component", async () => {
    const { prepTestComponent } = helper;

    const el = await prepTestComponent(MyComponent);

    expect(el.innerHTML).toBe("<main></main>");
  });

  it("should render a component with props", async () => {
    const { prepTestComponent } = helper;

    const el = await prepTestComponent(MyComponent, { text: "Hello" });

    expect(el.innerHTML).toBe("<main>Hello</main>");
  });

  it("should not log any errors to the console", async () => {
    const { prepTestComponent } = helper;
    const spy = jest.spyOn(console, "error").mockImplementation();

    await prepTestComponent(MyComponent);
    expect(spy).not.toHaveBeenCalled();
  });
});
