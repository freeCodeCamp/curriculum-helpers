# Curriculum Helpers

## RandomMocker

Mocks Math.random for testing purposes. Each time `mock()` is called the pseudo-random number generator is reset to its initial state, so that the same sequence of random numbers is generated each time. `restore()` restores the native Math.random function.

```javascript
const randomMocker = new RandomMocker();
randomMocker.mock();
Math.random(); // first call is always 0.2523451747838408
Math.random(); // second call is always 0.08812504541128874
randomMocker.mock();
Math.random(); // generator is reset, so we get 0.2523451747838408 again
randomMocker.restore();
Math.random(); // back to native Math.random
```

## concatRegex

Combines one or more regular expressions into one.

```javascript
const regex1 = /a\s/;
const regex2 = /b/;
concatRegex(regex1, regex2).source === "a\\sb";
```

## functionRegex

Given a function name and, optionally, a list of parameters, returns a regex that can be used to match that function declaration in a code block.

```javascript
let regex = functionRegex("foo", ["bar", "baz"]);
regex.test("function foo(bar, baz){}"); // true
regex.test("function foo(bar, baz, qux){}"); // false
regex.test("foo = (bar, baz) => {}"); // true
```

### Options

- capture: boolean - If true, the regex will capture the function definition, including it's body, otherwise not. Defaults to false.
- includeBody: boolean - If true, the regex will include the function body in the match. Otherwise it will stop at the first bracket. Defaults to true.

```javascript
let regEx = functionRegex("foo", ["bar", "baz"], { capture: true });
let combinedRegEx = concatRegex(/var x = "y"; /, regEx);

let match = `var x = "y";
function foo(bar, baz){}`.match(regex);
match[1]; // "function foo(bar, baz){}"
// i.e. only the function definition is captured
```

```javascript
let regEx = functionRegex("foo", ["bar", "baz"], { includeBody: false });

let match = `function foo(bar, baz){console.log('ignored')}`.match(regex);
match[1]; // "function foo(bar, baz){"
```

NOTE: capture does not work properly with arrow functions. It will capture text after the function body, too.

```javascript
let regEx = functionRegex("myFunc", ["arg1"], { capture: true });

let match =
  "myFunc = arg1 => arg1; console.log();\n // captured, unfortunately".match(
    regEx,
  );
match[1]; // "myFunc = arg1 => arg1; console.log();\n // captured, unfortunately"
```

## typedFunctionRegex

Given a function name and, optionally, a list of parameters, returns a regex that can be used to match that function declaration in a code block. This version is specifically designed to match Typescript typing.

```typescript
let regex = typedFunctionRegex("foo", "string", [
  "\\s*bar\\s*:\\s*string",
  "\\s*baz\\s*:\\s*string",
]);
regex.test("function foo(bar : string, baz : string) : string{}"); // true
regex.test("function foo(bar, baz, qux){}"); // false
regex.test("foo = (bar : string , baz : string) : string => {}"); // true
```

### Options

- capture: boolean - If true, the regex will capture the function definition, including it's body, otherwise not. Defaults to false.
- includeBody: boolean - If true, the regex will include the function body in the match. Otherwise it will stop at the first bracket. Defaults to true.

```typescript
let regEx = typedFunctionRegex(
  "foo",
  "string",
  ["\\s*bar\\s*:\\s*string", "\\s*baz\\s*:\\s*\\s*string"],
  { capture: true },
);
let combinedRegEx = concatRegex(/var x = "y"; /, regEx);

let match = `var x = "y";
function foo(bar : string , baz : string) : string{}`.match(regex);
match[1]; // "function foo(bar, baz){}"
// i.e. only the function definition is captured
```

```typescript
let regEx = typedFunctionRegex(
  "foo",
  "void",
  ["bar\\s*:\\s*string", "baz\\s*:\\s*string"],
  { includeBody: false },
);

let match =
  `function foo(bar:string, baz:string) : void {console.log('ignored')}`.match(
    regex,
  );
match[1]; // "function foo(bar, baz){"
```

NOTE: capture does not work properly with arrow functions. It will capture text after the function body, too.

```typescript
let regEx = typedFunctionRegex("myFunc", "void", ["arg1\\s*:\\s*string"], {
  capture: true,
});

let match =
  "myFunc = arg1 : string : void => arg1; console.log();\n // captured, unfortunately".match(
    regEx,
  );
match[1]; // "myFunc = arg1 => arg1; console.log();\n // captured, unfortunately"
```

## prepTestComponent

Renders a React component into a DOM element and returns a Promise containing the DOM element. The arguments are, respectively, the component to render and an (optional) object containing the props to pass to the component.

```javascript
import { SomeComponent } from "./SomeComponent";
const element = await prepTestComponent(SomeComponent, {
  someProp: "someValue",
});
element.querySelector("h1").textContent === "Some Value";
```

## permutateRegex

Permutates regular expressions or source strings, to create regex matching elements in any order.

```javascript
const source1 = "a";
const regex1 = /b/;
const source2 = "c";

permutateRegex([source1, regex1, source2]).source ===
  new RegExp(
    /(?:a\s*\|\|\s*b\s*\|\|\s*c|b\s*\|\|\s*a\s*\|\|\s*c|c\s*\|\|\s*a\s*\|\|\s*b|a\s*\|\|\s*c\s*\|\|\s*b|b\s*\|\|\s*c\s*\|\|\s*a|c\s*\|\|\s*b\s*\|\|\s*a)/,
  ).source;
```

Inputs can have capturing groups, but both groups and backreferrences need to be named. In the resulting regex they will be renamed to avoid duplicated names, and to allow backreferrences to refer to correct group.

```javascript
const regex = permutateRegex(["a", /(?<ref>'|"|`)b\k<ref>/], {
  elementsSeparator: String.raw`\s*===\s*`,
});

regex.source ===
  new RegExp(
    /(?:a\s*===\s*(?<ref_0>'|"|`)b\k<ref_0>|(?<ref_1>'|"|`)b\k<ref_1>\s*===\s*a)/,
  ).source;

regex.test('a === "b"'); // true
regex.test("'b' === a"); // true
regex.test("a === `b`"); // true
regex.test(`a === 'b"`); // false
```

### Options

- capture: boolean - Whole regex is wrapped in regex group. If `capture` is `true` the group will be capturing, otherwise it will be non-capturing. Defaults to `false`.
- elementsSeparator: string - Separates permutated elements within single permutation. Defaults to `\s*\|\|\s*`.
- permutationsSeparator: string - Separates permutations. Defaults to `|`.

```javascript
permutateRegex(["a", /b/, "c"], { capture: true }).source ===
  new RegExp(
    /(a\s*\|\|\s*b\s*\|\|\s*c|b\s*\|\|\s*a\s*\|\|\s*c|c\s*\|\|\s*a\s*\|\|\s*b|a\s*\|\|\s*c\s*\|\|\s*b|b\s*\|\|\s*c\s*\|\|\s*a|c\s*\|\|\s*b\s*\|\|\s*a)/,
  ).source;
```

```javascript
permutateRegex(["a", /b/, "c"], { elementsSeparator: "," }).source ===
  new RegExp(/(?:a,b,c|b,a,c|c,a,b|a,c,b|b,c,a|c,b,a)/).source;
```

```javascript
permutateRegex(["a", /b/, "c"], { permutationsSeparator: "&" }).source ===
  new RegExp(
    /(?:a\s*\|\|\s*b\s*\|\|\s*c&b\s*\|\|\s*a\s*\|\|\s*c&c\s*\|\|\s*a\s*\|\|\s*b&a\s*\|\|\s*c\s*\|\|\s*b&b\s*\|\|\s*c\s*\|\|\s*a&c\s*\|\|\s*b\s*\|\|\s*a)/,
  ).source;
```
