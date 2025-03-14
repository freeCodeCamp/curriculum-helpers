# Curriculum Helpers

## concatRegex

Combines one or more regular expressions into one.

```javascript
const regex1 = /a\s/;
const regex2 = /b/;
concatRegex(regex1, regex2).source === "a\\sb";
```

## permutateRegex

Permutates regular expressions or source strings, to create regex matching elements in any order.

```javascript
const source1 = 'a';
const regex1 = /b/;
const source2 = 'c';

permutateRegex([source1, regex1, source2]).source === new RegExp(/(?:a\s*\|\|\s*b\s*\|\|\s*c|b\s*\|\|\s*a\s*\|\|\s*c|c\s*\|\|\s*a\s*\|\|\s*b|a\s*\|\|\s*c\s*\|\|\s*b|b\s*\|\|\s*c\s*\|\|\s*a|c\s*\|\|\s*b\s*\|\|\s*a)/).source;
```

Inputs can have capturing groups, but both groups and backreferrences need to be named. In the resulting regex they will be renamed to avoid duplicated names, and to allow backreferrences to refer to correct group.

```javascript
const regex = permutateRegex(
    [
        'a',
        /(?<ref>'|"|`)b\k<ref>/
    ],
    { elementsSeparator: String.raw`\s*===\s*` }
);

regex.source === new RegExp(/(?:a\s*===\s*(?<ref_0>'|"|`)b\k<ref_0>|(?<ref_1>'|"|`)b\k<ref_1>\s*===\s*a)/).source;

regex.test('a === "b"') // true
regex.test("'b' === a") // true
regex.test('a === `b`') // true
regex.test(`a === 'b"`) // false
```

### Options
- capture: boolean - Whole regex is wrapped in regex group. If `capture` is `true` the group will be capturing, otherwise it will be non-capturing. Defaults to `false`.
- elementsSeparator: string - Separates permutated elements within single permutation. Defaults to `\s*\|\|\s*`.
- permutationsSeparator: string - Separates permutations. Defaults to `|`.

```js
permutateRegex(['a', /b/, 'c'], { capture: true }).source === new RegExp(/(a\s*\|\|\s*b\s*\|\|\s*c|b\s*\|\|\s*a\s*\|\|\s*c|c\s*\|\|\s*a\s*\|\|\s*b|a\s*\|\|\s*c\s*\|\|\s*b|b\s*\|\|\s*c\s*\|\|\s*a|c\s*\|\|\s*b\s*\|\|\s*a)/).source
```

```js
permutateRegex(['a', /b/, 'c'], { elementsSeparator: ',' }).source === new RegExp(/(?:a,b,c|b,a,c|c,a,b|a,c,b|b,c,a|c,b,a)/).source
```

```js
permutateRegex(['a', /b/, 'c'], { permutationsSeparator: '&' }).source === new RegExp(/(?:a\s*\|\|\s*b\s*\|\|\s*c&b\s*\|\|\s*a\s*\|\|\s*c&c\s*\|\|\s*a\s*\|\|\s*b&a\s*\|\|\s*c\s*\|\|\s*b&b\s*\|\|\s*c\s*\|\|\s*a&c\s*\|\|\s*b\s*\|\|\s*a)/).source
```
