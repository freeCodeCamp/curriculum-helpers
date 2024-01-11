import fs from "fs";
import { join } from "path";

const prepare = () => {
  const pyScript = fs
    .readFileSync(join(__dirname, "./py_helpers.py"), "utf8")
    .toString();
  const jsScript = `export const astHelpers = ${JSON.stringify(pyScript)}`;

  fs.writeFileSync(join(__dirname, "./index.ts"), jsScript);
};

prepare();
