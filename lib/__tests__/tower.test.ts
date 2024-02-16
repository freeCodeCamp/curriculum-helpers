/* eslint-disable */
import { Tower } from "../index";

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
      console.log(main);
    });
  });
  describe("getVariable", () => {
    it("works", () => {
      const a = t.getFunction("main").getVariable("a").generate;
      const b = t.getVariable("b").generate;
      const file = t.getFunction("doAsyncStuff").getVariable("file").generate;
      console.log(a);
      console.log(b);
      console.log(file);
    });
  });
});
