// @vitest-environment jsdom

import React from "react";
import ReactDOM from "react-dom/client";

import cssTestValues from "./__fixtures__/curriculum-helper-css";
import htmlTestValues from "./__fixtures__/curriculum-helpers-html";
import jsTestValues from "./__fixtures__/curriculum-helpers-javascript";
import whiteSpaceTestValues from "./__fixtures__/curriculum-helpers-remove-white-space";
import * as helper from "./../helpers/lib/index";
import { typedFunctionRegex } from "./../helpers/lib/index";

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

describe("spyOn", () => {
  const obj = {
    method(arg = "", arg2 = "") {
      return `original${arg}${arg2}`;
    },
  };

  it("should return a wrapped function", () => {
    const original = obj.method;

    const spy = helper.spyOn(obj, "method");

    expect(spy).toBeInstanceOf(Function);
    expect(spy).not.toBe(original);
  });

  it("should spy on the given method", () => {
    const spy = helper.spyOn(obj, "method");
    obj.method("arg");
    expect(spy.calls).toEqual([["arg"]]);
  });

  it("should collect multiple calls", () => {
    const spy = helper.spyOn(obj, "method");
    obj.method("arg1");
    obj.method("arg2");
    expect(spy.calls).toEqual([["arg1"], ["arg2"]]);
  });

  it("should capture all arguments", () => {
    const spy = helper.spyOn(obj, "method");
    obj.method("arg1", "arg2");
    expect(spy.calls).toEqual([["arg1", "arg2"]]);
  });

  it("should not modify the returned value", () => {
    helper.spyOn(obj, "method");
    const result = obj.method("arg");
    expect(result).toBe("originalarg");
  });

  it("should track the return value", () => {
    const spy = helper.spyOn(obj, "method");
    obj.method("arg");
    expect(spy.returns[0]).toBe("originalarg");
  });

  it("should track the return value of multiple calls", () => {
    const spy = helper.spyOn(obj, "method");
    obj.method("arg1");
    obj.method("arg2");
    expect(spy.returns).toEqual(["originalarg1", "originalarg2"]);
  });

  it("should restore the original method", () => {
    const spy = helper.spyOn(obj, "method");
    spy.restore();
    obj.method("arg");
    expect(spy.calls).toEqual([]);
  });

  it("should call the original function, providing 'this'", () => {
    const obj = {
      value: "obj",
      method(arg = "") {
        return this.value + arg;
      },
    };

    const spy = helper.spyOn(obj, "method");
    const result = obj.method("arg");
    expect(result).toBe("objarg");
    expect(spy.calls).toEqual([["arg"]]);
  });

  it("should throw if the spied on property is not a function", () => {
    const obj = {
      notAFunction: "foo",
    };

    vitest.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => helper.spyOn(obj, "notAFunction")).toThrow(
      "spyOn can only be called on function properties",
    );
  });
});

describe("spyOnCallbacks", () => {
  let obj;

  beforeEach(() => {
    obj = {
      method(arg1 = (x: string) => x, arg2 = "", arg3 = (y: string) => y) {
        return (...args: string[]) => {
          const cbArg1 = arg1(args[0]);
          const cbArg2 = arg3(args[1]);
          return `original${cbArg1}:${arg2}:${cbArg2}`;
        };
      },
    };
  });

  it("should return a wrapped function", () => {
    const original = obj.method;

    const spy = helper.spyOnCallbacks(obj, "method");

    expect(spy).toBeInstanceOf(Function);
    expect(spy).not.toBe(original);
  });

  it("should show how many times a callback was called", () => {
    const spyCollection = helper.spyOnCallbacks(obj, "method");
    const cb1 = (x: string) => x;
    const spiedOnMethod = obj.method(cb1, "arg2");

    spiedOnMethod("one");
    spiedOnMethod("two");
    const spies = spyCollection.callbackSpies[0];
    const firstSpy = spies[0];

    expect(firstSpy.calls).toHaveLength(2);
  });

  it("should record the arguments passed to any callbacks the method is called with", () => {
    const spyCollection = helper.spyOnCallbacks(obj, "method");

    const cb1 = (x: string) => x;
    const cb2 = (x: string) => x;
    const spiedOnMethod = obj.method(cb1, "arg2", cb2);

    spiedOnMethod("one", "two");

    const spies = spyCollection.callbackSpies[0];
    const firstSpy = spies[0];
    const secondSpy = spies[1];
    const thirdSpy = spies[2];

    expect(firstSpy.calls).toEqual([["one"]]);
    expect(secondSpy.calls).toBeUndefined();
    expect(thirdSpy.calls).toEqual([["two"]]);
  });

  it("should track the return values of the callbacks", () => {
    const spyCollection = helper.spyOnCallbacks(obj, "method");

    const cb1 = (x: string) => "cb1: " + x;
    const cb2 = (x: string) => "cb2: " + x;
    const spiedOnMethod = obj.method(cb1, "arg2", cb2);
    const result = spiedOnMethod("one", "two");

    expect(result).toBe("originalcb1: one:arg2:cb2: two");
    expect(spyCollection.callbackSpies[0][0].returns).toEqual(["cb1: one"]);
    expect(spyCollection.callbackSpies[0][2].returns).toEqual(["cb2: two"]);
  });

  it("should collect multiple calls", () => {
    const spyCollection = helper.spyOnCallbacks(obj, "method");

    const cb1 = (x: string) => x;
    const cb2 = (x: string) => x;
    const spiedOnMethod = obj.method(cb1, "arg2", cb2);
    spiedOnMethod("one", "two");
    spiedOnMethod("three", "four");

    const spies = spyCollection.callbackSpies[0];
    const firstSpy = spies[0];
    const secondSpy = spies[1];
    const thirdSpy = spies[2];
    expect(firstSpy.calls).toEqual([["one"], ["three"]]);
    expect(secondSpy.calls).toBeUndefined();
    expect(thirdSpy.calls).toEqual([["two"], ["four"]]);
  });

  it("should create a new collection of spies each time the method is called", () => {
    const spyCollection = helper.spyOnCallbacks(obj, "method");

    const cb1 = (x: string) => x;
    const cb2 = (x: string) => x;
    const spiedOnMethod = obj.method(cb1, "arg2", cb2);
    spiedOnMethod("one", "two");
    const spiedOnMethodTwo = obj.method(cb1, "arg2", cb2);
    spiedOnMethodTwo("three", "four");

    const firstSpies = spyCollection.callbackSpies[0];
    const secondSpies = spyCollection.callbackSpies[1];

    expect(firstSpies[0].calls).toEqual([["one"]]);
    expect(firstSpies[1].calls).toBeUndefined();
    expect(firstSpies[2].calls).toEqual([["two"]]);
    expect(secondSpies[0].calls).toEqual([["three"]]);
    expect(secondSpies[1].calls).toBeUndefined();
    expect(secondSpies[2].calls).toEqual([["four"]]);
  });

  it("should call the original callbacks", () => {
    const cb1 = vi.fn((x: string) => x);
    const cb2 = vi.fn((x: string) => x);
    const spiedOnMethod = obj.method(cb1, "arg2", cb2);
    spiedOnMethod("one", "two");

    expect(cb1).toHaveBeenCalledWith("one");
    expect(cb2).toHaveBeenCalledWith("two");
  });

  it("should be compatible with spyOn", () => {
    const spy = helper.spyOn(obj, "method");
    const spyCollection = helper.spyOnCallbacks(obj, "method");
    const cb1 = (x: string) => x;
    const cb2 = (x: string) => x;
    obj.method(cb1, "arg2", cb2);

    // @ts-expect-error I know it's defined.
    spy.calls[0][0]("one");
    // @ts-expect-error I know it's defined.
    spy.calls[0][2]("two");

    // The other calls are the wrapped functions that spyOnCallbacks creates and
    // those are indirectly checed by the final two assertions.
    expect(spy.calls[0][1]).toEqual("arg2");
    expect(spyCollection.callbackSpies[0][0].calls).toEqual([["one"]]);
    expect(spyCollection.callbackSpies[0][2].calls).toEqual([["two"]]);
  });

  it("should restore the original method", () => {
    const original = obj.method;
    const spyCollection = helper.spyOnCallbacks(obj, "method");
    expect(obj.method).not.toBe(original);

    spyCollection.restore();
    const cb1 = (x: string) => x;
    const cb2 = (x: string) => x;
    const spiedOnMethod = obj.method(cb1, "arg2", cb2);
    spiedOnMethod("one", "two");

    expect(obj.method).toBe(original);
    expect(spyCollection.callbackSpies).toEqual([]);
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

  it("should ignore comments inside multiline template strings", () => {
    const expected = `const foo = \`// this is a comment
* me too */\`;
const bar = \`// this is a comment
/* me too */\`;
`;
    const actual = removeJSComments(expected);

    expect(actual).toBe(expected);
  });

  it("should handle comments that end in a slash", () => {
    const expected = `const bar = \`// this is a comment \\
\`;`;
    const actual = removeJSComments(expected);

    expect(actual).toBe(expected);
  });

  it("should strip comments with quotes", () => {
    const expected = '\nconst foo = "bar";\n';
    const actual = removeJSComments(`// this is a comment with "quotes"
const foo = "bar";
`);

    expect(actual).toBe(expected);
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

  it("matches a named function that uses Typescript types", () => {
    const funcName = "myFunc";
    const regEx = typedFunctionRegex(funcName, "string", [
      "arg1\\s*:\\s*string",
      "arg2\\s*:\\s*string",
    ]);
    expect(
      regEx.test("function myFunc(arg1 : string, arg2 : string) : string{}"),
    ).toBe(true);
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

  it("matches anonymous Typescript functions", () => {
    const regEx = typedFunctionRegex(null, "string", [
      "arg1\\s*:\\s*string",
      "arg2\\s*:\\s*string",
    ]);
    expect(
      regEx.test("function(arg1 : string , arg2:string) : string {}"),
    ).toBe(true);
  });

  it("matches anonymous arrow functions", () => {
    const regEx = functionRegex(null, ["arg1", "arg2"]);
    expect(regEx.test("(arg1, arg2) => {}")).toBe(true);
  });

  it("matches anonymous Typescript arrow functions", () => {
    const regEx = typedFunctionRegex(null, "string", [
      "arg1\\s*:\\s*string",
      "arg2\\s*:\\s*string",
    ]);
    expect(regEx.test("(arg1 : string, arg2 : string) : string => {}")).toBe(
      true,
    );
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

  it("matches a arrow function that uses Typescript types", () => {
    const funcName = "myFunc";
    const regEx = typedFunctionRegex(funcName, "string", [
      "arg1\\s*:\\s*string",
      "arg2\\s*:\\s*string",
    ]);
    expect(
      regEx.test(
        "myFunc  = (arg1 : string, arg2 : string) : string => {return arg1 + arg2}",
      ),
    ).toBe(true);
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

  it("matches named anonymous function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1"]);
    expect(regEx.test("myFunc = function(arg1){}")).toBe(true);
  });
  it("matches named anonymous function without parameters", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName);
    expect(regEx.test("myFunc = function(){ }")).toBe(true);
  });
  it("does not match named anonymous function with different name", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName);
    expect(regEx.test("notMyFunc = function(arg1){ }")).toBe(false);
  });

  it("matches named anonymous function with arguments and a body", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"]);
    expect(
      regEx.test("myFunc = function(arg1, arg2){\n console.log()\n}"),
    ).toBe(true);
  });

  it("does not match named anonymous function with different arguments", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"]);
    expect(regEx.test("myFunc = function(arg1, arg3){}")).toBe(false);
  });
  it("matches const named anonymous function declarations if they are present", () => {
    const regEx = functionRegex("myFunc", ["arg1", "arg2"]);
    const func = "const myFunc = function(arg1, arg2) {}";
    const match = func.match(regEx);
    expect(match).not.toBeNull();
    expect(match![0]).toBe(func);
  });
  it("can capture named anonymous function", () => {
    const funcName = "myFunc";
    const regEx = functionRegex(funcName, ["arg1", "arg2"], { capture: true });
    const func = "myFunc = function(arg1, arg2){return arg1 + arg2}";
    const match = func.match(regEx);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(func);
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
    vi.restoreAllMocks();
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
    const spy = vi.spyOn(console, "error").mockImplementation(vi.fn());

    await prepTestComponent(MyComponent);
    expect(spy).not.toHaveBeenCalled();
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

    expect("b||c||a".match(regex)?.length).toEqual(2);
    expect("b||c||a".match(regex)?.[1]).toEqual("b||c||a");
  });

  it("returns not capturing regex when capture option is false", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex(["a", "b", "c"], { capture: false });

    expect("b||c||a".match(regex)?.length).toEqual(1);
  });

  it("renames capturing named groups to avoid duplicated group names", () => {
    const { permutateRegex } = helper;

    expect(() =>
      permutateRegex([/messageInput\.value/, /(?<ref>'|"|`)\k<ref>/], {
        elementsSeparator: String.raw`\s*===?\s*`,
      }),
    ).not.toThrow();
  });

  it("returns regex correctly backreferrencing the capturing named groups", () => {
    const { permutateRegex } = helper;
    const regex = permutateRegex([/a/, /(?<ref>'|"|`)b\k<ref>/], {
      elementsSeparator: String.raw`\s*===?\s*`,
    });

    expect(regex.test("a === 'b'")).toBe(true);
    expect(regex.test("a === `b`")).toBe(true);
    expect(regex.test('a === "b"')).toBe(true);
    expect(regex.test("'b' === a")).toBe(true);
    expect(regex.test("`b` === a")).toBe(true);
    expect(regex.test('"b" === a')).toBe(true);

    expect(regex.test("a === `b'")).toBe(false);
    expect(regex.test(`a === "b'`)).toBe(false);
    expect(regex.test("'b` === a")).toBe(false);
    expect(regex.test('`b" === a')).toBe(false);
    expect(regex.test(`'b" === a`)).toBe(false);
  });
});
