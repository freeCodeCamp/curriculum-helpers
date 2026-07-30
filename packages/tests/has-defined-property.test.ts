import { hasDefinedProperty } from "../shared/src/has-defined-property";

describe("hasDefinedProperty", () => {
  it("returns true when the property is present and defined", () => {
    expect(hasDefinedProperty({ expected: 0 }, "expected")).toBe(true);
    expect(hasDefinedProperty({ expected: false }, "expected")).toBe(true);
    expect(hasDefinedProperty({ expected: "" }, "expected")).toBe(true);
  });

  it("returns false when the property is missing", () => {
    expect(hasDefinedProperty({}, "expected")).toBe(false);
  });

  it("returns false when the property is explicitly undefined", () => {
    expect(hasDefinedProperty({ expected: undefined }, "expected")).toBe(false);
  });
});
