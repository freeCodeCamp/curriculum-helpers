import pkg from "../../../package.json" with { type: "json" };
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFolder = path.join(__dirname, "../../../dist");

if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder);

fs.writeFileSync(path.join(distFolder, "VERSION.txt"), pkg.version, {
  encoding: "utf8",
  flag: "w",
});
