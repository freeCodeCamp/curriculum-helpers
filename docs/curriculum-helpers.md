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

let match = "myFunc = arg1 => arg1; console.log();\n // captured, unfortunately".match(regEx);
match[1] // "myFunc = arg1 => arg1; console.log();\n // captured, unfortunately"
```

## prepTestComponent

Renders a React component into a DOM element and returns a Promise containing the DOM element. The arguments are, respectively, the component to render and an (optional) object containing the props to pass to the component.

```javascript
import { SomeComponent } from "./SomeComponent";
const element = await prepTestComponent(SomeComponent, { someProp: "someValue" });
element.querySelector("h1").textContent === "Some Value";
```

## permutateRegex

Permutates regular expressions or source strings, to create regex matching elements in any order.

```javascript
const source1 = `titleInput\\.value\\s*(?:!==|!=)\\s*currentTask\\.title`;
const regex1 = /dateInput\.value\s*(?:!==|!=)\s*currentTask\.date/;
const source2 = `descriptionInput\\.value\\s*(?:!==|!=)\\s*currentTask\\.description`;

permutateRegex([source1, regex1, source2]).source === new RegExp(/(?:titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description|dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description|descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date|titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date|dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title|descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title)/).source;
```
