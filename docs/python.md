# Python

## Regex-based helpers

### `getDef`

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

### `getBlock`

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

### `removeComments`

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

### `__pyodide.runPython`

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

## AST-based helpers

In contrast to the regex-based helpers, these helpers need to be run in Python, not
JavaScript

### Formatting output

`str` returns a string that would parse to the same AST as the node. For example:

```python
function_str = """
def foo():
  # will not be in the output
  x = 1

"""
output_str = """
def foo():
    x = 1"""
str(Node(function_str)) == output_str # True
```

The output and source string compile to the same AST, but the output is indented with 4 spaces. Comments and trailing whitespace are removed.

### Finding nodes

`find_` functions search the current scope and return one of the following:

- A single Node object if there can be only one match. E.g. `find_function`
- A list of Node objects if there can be multiple matches. E.g.: `find_ifs`

#### `find_function`

```python
Node('def foo():\n  x = "1"').find_function("foo").has_variable("x") # True
```

#### `find_variable`

```python
Node("y = 2\nx = 1").find_variable("x").is_equivalent("x = 1")
```

When the variable is out of scope, `find_variable` returns an `None` node (i.e. `Node()` or `Node(None)`):

```python
Node('def foo():\n  x = "1"').find_variable("x") == Node() # True
```

#### `find_body`

```python
func_str = """
def foo():
    x = 1"""
Node(func_str).find_function("foo").find_body().is_equivalent("x = 1") # True
```

#### `find_class`

```python
class_str = """
class Foo:
  def __init__(self):
    pass
"""
Node(class_str).find_class("Foo").has_function("__init__") # True
```

#### `find_ifs`

```python
if_str = """
x = 1
if x == 1:
  x = 2

if True:
  pass
"""

Node(if_str).find_ifs()[0].is_equivalent("if x == 1:\n  x = 2")
Node(if_str).find_ifs()[1].is_equivalent("if True:\n  pass")
```

#### `find_if`

```python
if_str = """
x = 1
if x == 1:
  x = 2

if True:
  pass
"""

Node(if_str).find_if("x == 1").is_equivalent("if x == 1:\n  x = 2")
Node(if_str).find_if("True").is_equivalent("if True:\n  pass")
```

#### `find_conditions`

```python
if_str = """
if True:
  x = 1
else:
  x = 4
"""
explorer = Node(if_str)
len(explorer.find_ifs()[0].find_conditions()) # 2
explorer.find_ifs()[0].find_conditions()[0].is_equivalent("True")

Node("x = 1").find_conditions() # []
```

#### `find_if_bodies`

```python
if_str = """
if True:
  x = 1
"""
explorer.find_ifs()[0].find_if_bodies()[0].is_equivalent("x = 1") # True
```

#### `find_whiles`

```python
while_str = """
while True:
  x += 1

while False:
  pass
"""
explorer = Node(while_str)
explorer.find_whiles()[0].is_equivalent("while True:\n  x += 1")
explorer.find_whiles()[1].is_equivalent("while False:\n  pass")
```

#### `find_while`

```python
while_str = """
while True:
  x += 1

while False:
  pass
"""
explorer = Node(while_str)
explorer.find_while("True").is_equivalent("while True:\n  x += 1")
explorer.find_while("False").is_equivalent("while False:\n  pass")
```

#### `find_while_conditions`

```python
while_str = """
while True:
  x += 1

while False:
  pass
"""
explorer = Node(while_str)
explorer.find_while()[0].find_while_conditions()[0].is_equivalent("True")
explorer.find_while()[1].find_while_conditions()[0].is_equivalent("False")
```

#### `find_while_bodies`

```python
while_str = """
while True:
  x += 1

while False:
  pass
"""
explorer = Node(while_str)
explorer.find_while()[0].find_while_bodies()[0].is_equivalent("x += 1")
explorer.find_while()[1].find_while_bodies()[0].is_equivalent("pass")
```

#### `find_for_loops`

```python
for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    pass
    
for i in range(4):
    pass
"""
explorer = Node(for_str)
explorer.find_for_loops()[0].is_equivalent("for x, y in enumerate(dict):\n  print(x, y)\nelse:\n  pass")
explorer.find_for_loops()[1].is_equivalent("for i in range(4):\n  pass")
```

#### `find_for`

```python
for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    pass
    
for i in range(4):
    pass
"""
explorer = Node(for_str)
explorer.find_for("(x, y)", "enumerate(dict)").is_equivalent("for x, y in enumerate(dict):\n  print(x, y)\nelse:\n  pass")
explorer.find_for("i", "range(4)").is_equivalent("for i in range(4):\n  pass")
```

#### `find_for_vars`

```python
for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    pass
    
for i in range(4):
    pass
"""
explorer = Node(for_str)
explorer.find_for_loops()[0].find_for_vars().is_equivalent("(x, y)")
explorer.find_for_loops()[1].find_for_vars().is_equivalent("i")
```

#### `find_for_iter`

```python
for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    pass
    
for i in range(4):
    pass
"""
explorer = Node(for_str)
explorer.find_for_loops()[0].find_for_iter().is_equivalent("enumerate(dict)")
explorer.find_for_loops()[1].find_for_iter().is_equivalent("range(4)")
```

#### `find_for_bodies`

```python
for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    print(x)
    
for i in range(4):
    pass
"""
explorer = Node(for_str)
explorer.find_for_loops()[0].find_for_bodies()[0].is_equivalent("print(x, y)")
explorer.find_for_loops()[0].find_for_bodies()[1].is_equivalent("print(x)")
explorer.find_for_loops()[1].find_for_bodies()[0].is_equivalent("pass")
```

### Getting values

`get_` functions return the value of the node, not the node itself.

#### `get_variable`

```python
Node("x = 1").get_variable("x") # 1
```

### Checking for existence

`has_` functions return a boolean indicating whether the node exists.

#### `has_variable`

```python
Node("x = 1").has_variable("x") # True
```

#### `has_function`

```python
Node("def foo():\n  pass").has_function("foo") # True
```

### Misc

#### `is_equivalent`

This is a somewhat loose check. The AST of the target string and the AST of the node do not have to be identical, but the code must be equivalent.

```python
Node("x = 1").is_equivalent("x = 1") # True
Node("\nx = 1").is_equivalent("x =    1") # True
Node("x = 1").is_equivalent("x = 2") # False
```

#### get the nth statement

```python
stmts = """
if True:
  pass

x = 1
"""

Node(stmts).get_nth_statement(1).is_equivalent("x = 1") # True
```

#### `value_is_call`

This allows you to check if the return value of function call is assigned to a variable.

```python
explorer = Node("def foo():\n  x = bar()")

explorer.find_function("foo").find_variable("x").value_is_call("bar") # True
```

#### `is_integer`

```python
Node("x = 1").find_variable("x").is_integer() # True
Node("x = '1'").find_variable("x").is_integer() # False
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
