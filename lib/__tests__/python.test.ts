import * as helper from "../index";

describe("python", () => {
  const { python } = helper;
  it("getDef", () => {
    const code = `
a = 1

def b(d, e):
  a = 2

def c():
  a = 1
`;
    const match = python.getDef(code, "b");
    if (match) {
      const { def, function_indentation, function_body, function_parameters } =
        match;
      expect(def).toEqual(`def b(d, e):
  a = 2
`);
      expect(function_indentation).toEqual(0);
      expect(function_body).toEqual("  a = 2\n");
      expect(function_parameters).toEqual("d, e");
    }
  });
});
