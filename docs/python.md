# Python

## Browser

Testing a function:

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
