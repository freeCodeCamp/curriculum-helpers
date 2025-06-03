import { inspect } from "util/util";

const quoteString = (x: unknown) => (typeof x === "string" ? `'${x}'` : x);

export function format(x: unknown): string {
  // We're trying to mimic console.log, so we avoid wrapping strings in quotes:
  if (typeof x === "string") return x;
  if (x instanceof Set) {
    return `Set(${x.size}) { ${Array.from(x, quoteString).join(", ")} }`;
  }

  if (x instanceof Map) {
    return `Map(${x.size}) {${Array.from(
      x.entries(),
      ([k, v]) => ` '${k}' => ${v}`,
    ).join(",")} }`;
  }

  if (typeof x === "bigint") {
    return x.toString() + "n";
  }

  if (typeof x === "symbol") {
    return x.toString();
    // This is used in workers as well as documents, so we need to check for
    // the existence of NodeList
  }

  if (typeof NodeList !== "undefined" && x instanceof NodeList) {
    return x.length === 0 ? "NodeList []" : `NodeList(${x.length}) [...]`;
  }

  if (x instanceof Error) {
    return `${x.name}: ${x.message}`;
  }

  return inspect(x);
}
