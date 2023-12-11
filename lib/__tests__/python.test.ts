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

  it("getBlock", () => {
    const code = `
a = 1

if a == 1:
  a = 2
  b = 3
  if b == 3:
    a = 4

for i in range(10):
  a = 1
`;
    const matches = [
      python.getBlock(code, "if a == 1"),
      python.getBlock(code, /if +\w+ *== *\d+/),
      // eslint-disable-next-line prefer-regex-literals
      python.getBlock(code, new RegExp("if +\\w+ *== *\\d+")),
    ];
    for (const match of matches) {
      expect(match).not.toBeNull();
      if (match) {
        // eslint-disable-next-line camelcase
        const { block_indentation, block_body, block_condition } = match;
        expect(block_condition).toEqual("if a == 1");
        expect(block_indentation).toEqual(0);
        expect(block_body).toEqual(
          `  a = 2
  b = 3
  if b == 3:
    a = 4
`
        );
      }
    }

    const matches2 = [
      python.getBlock(code, "for i in range(10)"),
      python.getBlock(code, /for +\w+ +in +range\(\d+\)/),
      // eslint-disable-next-line prefer-regex-literals
      python.getBlock(code, new RegExp("for +\\w+ +in +range\\(\\d+\\)")),
    ];
    for (const match of matches2) {
      expect(match).not.toBeNull();
      if (match) {
        // eslint-disable-next-line camelcase
        const { block_indentation, block_body, block_condition } = match;
        expect(block_condition).toEqual("for i in range(10)");
        expect(block_indentation).toEqual(0);
        expect(block_body).toEqual(`  a = 1
`);
      }
    }
  });
});
