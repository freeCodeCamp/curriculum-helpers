/**
 * @jest-environment jsdom
 */
import { format } from "./format";

function simpleFun() {
	// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
	var x = "y";
}

/* format uses util.inspect to do almost everything, the tests are just there
to warn us if util.inspect ever changes */
describe("format", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});
	it("returns a string", () => {
		expect(typeof format("")).toBe("string");
		expect(typeof format({})).toBe("string");
		expect(typeof format([])).toBe("string");
	});
	it("does not modify strings", () => {
		expect(format("")).toBe("");
		expect(format("abcde")).toBe("abcde");
		expect(format("Case Sensitive")).toBe("Case Sensitive");
	});
	it("formats shallow objects nicely", () => {
		expect(format({})).toBe("{}");
		expect(format({ a: "one", b: "two" })).toBe(`{ a: 'one', b: 'two' }`);
	});
	it("formats functions the same way as console.log", () => {
		expect(format(simpleFun)).toBe("[Function: simpleFun]");
	});
	it("recurses into arrays", () => {
		const objsInArr = [{ a: "one" }, "b", simpleFun];
		expect(format(objsInArr)).toBe(
			`[ { a: 'one' }, 'b', [Function: simpleFun] ]`,
		);
	});
	it("handles all primitive values", () => {
		const primitives = ["str", 57, true, false, null, undefined];
		expect(format(primitives)).toBe(
			`[ 'str', 57, true, false, null, undefined ]`,
		);
		expect(format(BigInt(10))).toBe(`10n`);
		expect(format(Symbol("Sym"))).toBe(`Symbol(Sym)`);
	});
	it(`outputs NaN as 'NaN'`, () => {
		expect(format(NaN)).toBe("NaN");
	});
	it("handles Maps", () => {
		const map = new Map([
			["a", 1],
			["b", 2],
		]);
		expect(format(map)).toBe("Map(2) { 'a' => 1, 'b' => 2 }");
	});
	it("handles Sets", () => {
		const set = new Set([1, "2", 3]);
		expect(format(set)).toBe("Set(3) { 1, '2', 3 }");
	});
	it("handles BigInts", () => {
		expect(format(BigInt(10))).toBe("10n");
		expect(format(BigInt(0))).toBe("0n");
		expect(format(BigInt(-1))).toBe("-1n");
	});
	it("handles Symbols", () => {
		expect(format(Symbol("foo"))).toBe("Symbol(foo)");
		expect(format(Symbol.iterator)).toBe("Symbol(Symbol.iterator)");
	});
	it("handles empty NodeLists", () => {
		const nodeList = document.querySelectorAll("h12");
		expect(format(nodeList)).toBe("NodeList []");
	});
	it("provides a placeholder for non-empty NodeLists", () => {
		document.body.innerHTML = `
			<h1>Test</h1>`;
		const nodeList = document.querySelectorAll("h1");
		expect(format(nodeList)).toBe(`NodeList(1) [...]`);
	});
});
