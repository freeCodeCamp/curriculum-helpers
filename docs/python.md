# Python

## `getDef`

```javascript,mdbook-runnable,hidelines=#
# {{#rustdoc_include tools/helpers.js:1}}
const code = `
a = 1
b = 2

def add(x, y):
    result = x + y
    print(f"{x} + {y} = {result}")
    return result

`;

{
  const add = __helpers.python.getDef(code, "add");
  const { function_body, function_indentation, def, function_parameters } =
    add;
  console.assert(function_indentation === 0);
  console.assert(function_parameters === "x, y");
  console.assert(function_body.match(/result\s*=\s*x\s*\+\s*y/));
  console.log(add);
}
```

## `getBlock`

```javascript,mdbook-runnable,hidelines=#
# {{#rustdoc_include tools/helpers.js:1}}
const code = `
a = 1
b = 2

def add_or_subtract(a, b, add=True):
    if add:
      return a + b
    else:
      return a - b

`;

{
  const equivalentPatterns = [
    "if add",
    /(if|elif) add/,
  ];
  for (const pattern of equivalentPatterns) {
    const ifBlock = __helpers.python.getBlock(code, pattern);
    const { block_body, block_indentation, block_condition } = ifBlock;
    console.assert(block_indentation === 4);
    console.assert(block_condition === "if add");
    console.assert(block_body.match(/return a \+ b/));
    console.log(ifBlock);
  }
}
```

## `removeComments`

```javascript,mdbook-runnable,hidelines=#
# {{#rustdoc_include tools/helpers.js:1}}
// Note: Comment identifiers are escaped for docs markdown parser
const code = `
a = 1
\# comment
def b(d, e):
    a = 2
    \# comment
    return a #comment
`;
{
  const commentlessCode = __helpers.python.removeComments(code);
  console.assert(commentlessCode === `\na = 1\n\ndef b(d, e):\n    a = 2\n    \n    return a \n`);
  console.log(commentlessCode);
}
```

## `__pyodide.runPython`

Running the code of a singluar function to get the output:

```javascript,mdbook-runnable,hidelines=#
# {{#rustdoc_include tools/helpers.js:1}}
# {{#rustdoc_include tools/pyodide.js:1}}
const code = `
a = 1
b = 2

def add(x, y):
  result = x + y
  print(f"{x} + {y} = {result}")
  return result

`;

{
  const add = __helpers.python.getDef(code, "add");
  const { function_body, function_indentation, def, function_parameters } =
    add;
  const c = `
a = 100
b = 200

def add(${function_parameters}):
${' '.repeat(function_indentation)}assert ${function_parameters.split(',')[0]} == 100
${function_body}

assert add(a, b) == 300
`;
  const out = __pyodide.runPython(c); // If this does not throw, code is correct
  console.log(add);
}
```

## Notes on Python

- Python does **not** allow newline characters between keywords and their arguments. E.g:

```python
def
    add(x, y):
    return x + y
```

- Python **does** allow newline characters between function arguments. E.g:

```python
def add(
  x,
  y
):
    return x + y
```
