import { Tower, generate } from "../index";

const code = `
import { readFile } from "fs/promises";

async function main() {
  doSyncStuff();

  const a = await doAsyncStuff(1);
  console.log(a);
}

// Test
async function doAsyncStuff(num) {
  // Another test
  const file = await readFile("file_loc" + num, "utf-8");
  return file;
}

const a = [];

const b = {
  c: () => {
    const c = 1;
  },
  "example-a": {
    a: 1
  }
}

const { c, d, e } = b;

const [f, g] = [c, d];

let h, i;

a.map(function (e) {});

function doSyncStuff() {
  console.log("stuff");
}

main();
`;

const t = new Tower(code);

describe("tower", () => {
  describe("getFunction", () => {
    it("works", () => {
      const main = t.getFunction("main").generate;
      expect(main).toEqual(
        `async function main() {
  doSyncStuff();
  const a = await doAsyncStuff(1);
  console.log(a);
}

// Test`,
      );
    });
  });
  describe("getVariable", () => {
    it("works", () => {
      const a = t.getFunction("main").getVariable("a").generate;
      expect(a).toEqual("const a = await doAsyncStuff(1);");
      const b = t.getVariable("b").generate;
      expect(b).toEqual(`const b = {
  c: () => {
    const c = 1;
  },
  "example-a": {
    a: 1
  }
};`);
      const file = t.getFunction("doAsyncStuff").getVariable("file").generate;
      expect(file).toEqual(
        '// Another test\nconst file = await readFile("file_loc" + num, "utf-8");',
      );
    });
  });
  describe("getCalls", () => {
    it("works", () => {
      const aMap = t.getCalls("a.map");
      expect(aMap).toHaveLength(1);
      const map = aMap.at(0);
      // @ts-expect-error - expression does exist.
      const argumes = map?.ast.expression?.arguments;
      expect(generate(argumes.at(0), { compact: true }).code).toEqual(
        "function(e){}",
      );
    });
  });
});
