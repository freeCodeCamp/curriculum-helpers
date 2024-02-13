# Curriculum Helpers

## concatRegex

Combines one or more regular expressions into one.

```javascript
const regex1 = /a\s/;
const regex2 = /b/;
concatRegex(regex1, regex2).source === "a\\sb";
```

## functionRegexString

Given a function name and, optionally, a list of parameters, returns a regex string that can be used to match that function declaration in a code block.

```javascript
let regex = functionRegexString("foo", ["bar", "baz"]);
regex.test("function foo(bar, baz){}"); // => true
regex.test("function foo(bar, baz, qux){}"); // => false
regex.test("foo = (bar, baz) => {}"); // => true
```
