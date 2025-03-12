import jsTestValues from "../__fixtures__/curriculum-helpers-javascript";

import { getFunctionParams } from "../index";

const {
  functionDeclaration,
  constFunction,
  letFunction,
  arrowFunction,
  destructuredArgsFunctionDeclaration,
} = jsTestValues;

describe("js-help", () => {
  describe("getFunctionArgs", () => {
    it("gets arguments from function declarations", function () {
      const parameters = getFunctionParams(functionDeclaration);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("gets arguments from const function variables", function () {
      const parameters = getFunctionParams(constFunction);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("gets arguments from let function variables", function () {
      const parameters = getFunctionParams(letFunction);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("gets arguments from arrow functions", function () {
      const parameters = getFunctionParams(arrowFunction);
      expect(parameters[0].name).toBe("name");
    });
    it("gets arguments from a destructured function declaration", function () {
      const parameters = getFunctionParams(destructuredArgsFunctionDeclaration);
      expect(parameters[0].name).toBe("a");
      expect(parameters[1].name).toBe("b");
      expect(parameters[2].name).toBe("c");
      expect(parameters[2].defaultValue).toBe("1");
      expect(parameters[3].name).toBe("...rest");
    });
  });
});
