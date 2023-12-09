# CSS

## Browser

````admonish example collapsible=true title="CSS Code Tested"
```css
:root {
  --building-color1: #aa80ff;
  --building-color2: #66cc99;
  --building-color3: #cc6699;
  --building-color4: #538cc6;
  --window-color1: #bb99ff;
  --window-color2: #8cd9b3;
  --window-color3: #d98cb3;
  --window-color4: #8cb3d9;
}
* {
  box-sizing: border-box;
}
body {
  height: 100vh;
  margin: 0;
  overflow: hidden;
}
.background-buildings,
.foreground-buildings {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-evenly;
  position: absolute;
  top: 0;
}
.building-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.window-wrap {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}
.sky {
  background: radial-gradient(
    closest-corner circle at 15% 15%,
    #ffcf33,
    #ffcf33 20%,
    #ffff66 21%,
    #bbeeff 100%
  );
}
/* BACKGROUND BUILDINGS - "bb" stands for "background building" */
.bb1 {
  width: 10%;
  height: 70%;
}
.bb1a {
  width: 70%;
}
.bb1b {
  width: 80%;
}
.bb1c {
  width: 90%;
}
.bb1d {
  width: 100%;
  height: 70%;
  background: linear-gradient(var(--building-color1) 50%, var(--window-color1));
}
.bb1-window {
  height: 10%;
  background: linear-gradient(var(--building-color1), var(--window-color1));
}
.bb2 {
  width: 10%;
  height: 50%;
}
.bb2a {
  border-bottom: 5vh solid var(--building-color2);
  border-left: 5vw solid transparent;
  border-right: 5vw solid transparent;
}
.bb2b {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    var(--building-color2),
    var(--building-color2) 6%,
    var(--window-color2) 6%,
    var(--window-color2) 9%
  );
}
.bb3 {
  width: 10%;
  height: 55%;
  background: repeating-linear-gradient(
    90deg,
    var(--building-color3),
    var(--building-color3),
    var(--window-color3) 15%
  );
}
.bb4 {
  width: 11%;
  height: 58%;
}
.bb4a {
  width: 3%;
  height: 10%;
  background-color: var(--building-color4);
}
.bb4b {
  width: 80%;
  height: 5%;
  background-color: var(--building-color4);
}
.bb4c {
  width: 100%;
  height: 85%;
  background-color: var(--building-color4);
}
.bb4-window {
  width: 18%;
  height: 90%;
  background-color: var(--window-color4);
}
/* FOREGROUND BUILDINGS - "fb" stands for "foreground building" */
.fb1 {
  width: 10%;
  height: 60%;
}
.fb1a {
  border-bottom: 7vh solid var(--building-color4);
  border-left: 2vw solid transparent;
  border-right: 2vw solid transparent;
}
.fb1b {
  width: 60%;
  height: 10%;
  background-color: var(--building-color4);
}
.fb1c {
  width: 100%;
  height: 80%;
  background: repeating-linear-gradient(
      90deg,
      var(--building-color4),
      var(--building-color4) 10%,
      transparent 10%,
      transparent 15%
    ),
    repeating-linear-gradient(
      var(--building-color4),
      var(--building-color4) 10%,
      var(--window-color4) 10%,
      var(--window-color4) 90%
    );
}
.fb2 {
  width: 10%;
  height: 40%;
}
.fb2a {
  width: 100%;
  border-bottom: 10vh solid var(--building-color3);
  border-left: 1vw solid transparent;
  border-right: 1vw solid transparent;
}
.fb2b {
  width: 100%;
  height: 75%;
  background-color: var(--building-color3);
}
.fb2-window {
  width: 22%;
  height: 100%;
  background-color: var(--window-color3);
}
.fb3 {
  width: 10%;
  height: 35%;
}
.fb3a {
  width: 80%;
  height: 15%;
  background-color: var(--building-color1);
}
.fb3b {
  width: 100%;
  height: 35%;
  background-color: var(--building-color1);
}
.fb3-window {
  width: 25%;
  height: 80%;
  background-color: var(--window-color1);
}
.fb4 {
  width: 8%;
  height: 45%;
  position: relative;
  left: 10%;
}
.fb4a {
  border-top: 5vh solid transparent;
  border-left: 8vw solid var(--building-color1);
}
.fb4b {
  width: 100%;
  height: 89%;
  background-color: var(--building-color1);
  display: flex;
  flex-wrap: wrap;
}
.fb4-window {
  width: 30%;
  height: 10%;
  border-radius: 50%;
  background-color: var(--window-color1);
  margin: 10%;
}
.fb5 {
  width: 10%;
  height: 33%;
  position: relative;
  right: 10%;
  background: repeating-linear-gradient(
      var(--building-color2),
      var(--building-color2) 5%,
      transparent 5%,
      transparent 10%
    ),
    repeating-linear-gradient(
      90deg,
      var(--building-color2),
      var(--building-color2) 12%,
      var(--window-color2) 12%,
      var(--window-color2) 44%
    );
}
.fb6 {
  width: 9%;
  height: 38%;
  background: repeating-linear-gradient(
      90deg,
      var(--building-color3),
      var(--building-color3) 10%,
      transparent 10%,
      transparent 30%
    ),
    repeating-linear-gradient(
      var(--building-color3),
      var(--building-color3) 10%,
      var(--window-color3) 10%,
      var(--window-color3) 30%
    );
}
@media (max-width: 1000px) {
  .sky {
    background: radial-gradient(
      closest-corner circle at 15% 15%,
      #ffcf33,
      #ffcf33 20%,
      #ffff66 21%,
      #bbeeff 100%
    );
  }
}
```
````

```javascript,mdbook-runnable,hidelines=#
const tester = new CSSHelp(document);
describe("getStyle", () => {
  it("should return an ExtendedCSSStyleDeclartion object of length 1", () => {
    expect(tester.getStyle("*")?.length).toEqual(1);
  });
  it("should return a non-empty ExtendedCSSStyleDeclaration object", () => {
    expect(tester.getStyle(".bb1")).toBeTruthy();
  });
  it("should return a whitespaceless string", () => {
    expect(tester.getStyle(".bb1d")?.getPropVal("background", true)).toEqual(
      "linear-gradient(var(--building-color1)50%,var(--window-color1))"
    );
  });
});
describe("getStyleAny", () => {
  it("should return an ExtendedCSSStyleDeclartion object of length 1", () => {
    expect(tester.getStyleAny([".earth", ".sky"])?.length).toEqual(1);
  });
  it("should return null", () => {
    expect(tester.getStyleAny([".sun", ".earth", ".moon"])).toBeNull();
  });
});
describe("isPropertyUsed", () => {
  it("should return true on existing properties", () => {
    expect(tester.isPropertyUsed("height")).toBeTruthy();
  });
  it("should return true on existing custom properties", () => {
    expect(tester.isPropertyUsed("--building-color1")).toBeTruthy();
  });
});
describe("isDeclaredAfter", () => {
  it("should return true if existing style is declared after another", () => {
    expect(tester.getStyleRule(".bb1a")?.isDeclaredAfter(".bb1")).toBeTruthy();
  });
});
describe("getPropertyValue", () => {
  it("should return custom property value needing trim", () => {
    expect(
      tester.getStyle(":root")?.getPropertyValue("--building-color1")?.trim()
    ).toEqual("#aa80ff");
  });
  it("should return value to existing property", () => {
    expect(
      tester.getStyle(".bb4a")?.getPropertyValue("background-color")
    ).toBeTruthy();
  });
  it("should return property value without evaluating result", () => {
    expect(tester.getStyle(".bb4a")?.getPropertyValue("background-color")).toEqual(
      "var(--building-color4)"
    );
  });
});
describe("getCSSRules", () => {
  it("should return a CSSRules array of length 1", () => {
    expect(tester.getCSSRules("media")?.length).toEqual(1);
  });
});
describe("getRuleListsWithinMedia", () => {
  it("should return a CSSMediaRule array with a selectable CSSStyleRule", () => {
    expect(
      t
        .getRuleListsWithinMedia("(max-width: 1000px)")
        .find((x) => x.selectorText === ".sky")
    ).toBeTruthy();
  });
  it("should return CSSStyleDeclaration property with complex value", () => {
    // NOTE: JSDOM causes value to have tabbed characters, DOM has single-line values.
    expect(
      t
        .getRuleListsWithinMedia("(max-width: 1000px)")
        .find((x) => x.selectorText === ".sky")?.style?.background
    ).toEqual(
      `radial-gradient(
    closest-corner circle at 15% 15%,
    #ffcf33,
    #ffcf33 20%,
    #ffff66 21%,
    #bbeeff 100%
  )`
    );
  });
});
describe("selectorsFromSelector", () => {
  it("should return an empty array", () => {
    setupDocument();
    expect(tester.selectorsFromSelector(".void")).toEqual([]);
  });
  it("should return an array with 9 members", () => {
    setupDocument();
    expect(tester.selectorsFromSelector("a")).toEqual([
      "a",
      "label > a",
      "label a",
      "form > label > a",
      "form label a",
      "body > form > label > a",
      "body form label a",
      "html > body > form > label > a",
      "html body form label a",
    ]);
  });
});
```
