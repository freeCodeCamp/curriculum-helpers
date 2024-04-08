import jsTestValues from "../__fixtures__/curriculum-helpers-javascript";

import { JSHelpers } from "../index";

const { codeString1, codeString2, codeString3, codeString4 } = jsTestValues;

describe("js-help", () => {
  describe("getFunctionArgs", () => {
    it("function", function () {
      const helpers = new JSHelpers();
      const parameters = helpers.getFunctionArgs(codeString1);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("anonymous", function () {
      const helpers = new JSHelpers();
      const parameters = helpers.getFunctionArgs(codeString2);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("let", function () {
      const helpers = new JSHelpers();
      const parameters = helpers.getFunctionArgs(codeString3);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("arrow", function () {
      const helpers = new JSHelpers();
      const parameters = helpers.getFunctionArgs(codeString4);
      expect(parameters[0].name).toBe("name");
    });
  });
});
