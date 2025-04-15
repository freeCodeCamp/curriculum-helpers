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

Running the code of a singular function to get the output:

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

#### `find_functions`

```python
code_str = """
class Spam(ABC):
  @property
  @abstractmethod
  def foo(self):
    return self.x

  @foo.setter
  @abstractmethod
  def foo(self, new_x):
    self.x = new_x
"""
explorer = Node(code_str)
len(explorer.find_class("Spam").find_functions("foo")) # 2
explorer.find_class("Spam").find_functions("foo")[0].is_equivalent("@property\n@abstractmethod\ndef foo(self):\n  return self.x") # True
explorer.find_class("Spam").find_functions("foo")[1].is_equivalent("@foo.setter\n@abstractmethod\ndef foo(self, new_x):\n  self.x = new_x") # True
```

#### `find_async_function`

```python
Node('async def foo():\n  await bar()').find_async_function("foo").is_equivalent("async def foo():\n  await bar()") # True
```

#### `find_awaits`

```python
code_str = """
async def foo(spam):
  if spam:
    await spam()
  await bar()
  await func()
"""
explorer = Node(code_str)
explorer.find_async_function("foo").find_awaits()[0].is_equivalent("await bar()") # True
explorer.find_async_function("foo").find_awaits()[1].is_equivalent("await func()") # True
explorer.find_async_function("foo").find_ifs()[0].find_awaits()[0].is_equivalent("await spam()") # True
```

#### `find_variable`

```python
Node("y = 2\nx = 1").find_variable("x").is_equivalent("x = 1")
Node("a: int = 1").find_variable("a").is_equivalent("a: int = 1")
Node("self.spam = spam").find_variable("self.spam").is_equivalent("self.spam = spam")
```

#### `find_aug_variable`

```python
Node("x += 1").find_aug_variable("x").is_equivalent("x += 1")
Node("x -= 1").find_aug_variable("x").is_equivalent("x -= 1")
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

#### `find_return`

```python
code_str = """
def foo():
  if x == 1:
    return False
  return True
"""
Node(code_str).find_function("foo").find_return().is_equivalent("return True") # True
Node(code_str).find_function("foo").find_ifs()[0].find_return().is_equivalent("return False") # True
```

#### `find_calls`

```python
 code_str = """
print(1)
print(2)
foo("spam")
obj.foo("spam")
obj.bar.foo("spam")
"""
explorer = Node(code_str)
len(explorer.find_calls("print")) # 2
explorer.find_calls("print")[0].is_equivalent("print(1)")
explorer.find_calls("print")[1].is_equivalent("print(2)")
len(explorer.find_calls("foo")) # 3
explorer.find_calls("foo")[0].is_equivalent("foo('spam')")
explorer.find_calls("foo")[1].is_equivalent("obj.foo('spam')")
explorer.find_calls("foo")[2].is_equivalent("obj.bar.foo('spam')")
```

#### `find_call_args`

```python
explorer = Node("print(1, 2)")
len(explorer.find_calls("print")[0].find_call_args()) # 2
explorer.find_calls("print")[0].find_call_args()[0].is_equivalent("1")
explorer.find_calls("print")[0].find_call_args()[1].is_equivalent("2")
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
if x == 1:
  x += 1
elif x == 2:
  pass
else:
  return

if True:
  pass
"""

Node(if_str).find_ifs()[0].is_equivalent("if x == 1:\n  x += 1\nelif x == 2:\n  pass\nelse:\n  return")
Node(if_str).find_ifs()[1].is_equivalent("if True:\n  pass")
```

#### `find_if`

```python
if_str = """
if x == 1:
  x += 1
elif x == 2:
  pass
else:
  return

if True:
  pass
"""

Node(if_str).find_if("x == 1").is_equivalent("if x == 1:\n  x += 1\nelif x == 2:\n  pass\nelse:\n  return")
Node(if_str).find_if("True").is_equivalent("if True:\n  pass")
```

#### `find_whiles`

```python
while_str = """
while True:
  x += 1
else:
  return

while False:
  pass
"""
explorer = Node(while_str)
explorer.find_whiles()[0].is_equivalent("while True:\n  x += 1\nelse:\n  return") # True
explorer.find_whiles()[1].is_equivalent("while False:\n  pass") # True
```

#### `find_while`

```python
while_str = """
while True:
  x += 1
else:
  return

while False:
  pass
"""
explorer = Node(while_str)
explorer.find_while("True").is_equivalent("while True:\n  x += 1\nelse:\n  return") # True
explorer.find_while("False").is_equivalent("while False:\n  pass") # True
```

#### `find_conditions`

```python
if_str = """
if x > 0:
  x = 1
elif x < 0:
  x = -1
else:
  return x
"""
explorer1 = Node(if_str)
len(explorer1.find_ifs()[0].find_conditions()) # 3
explorer1.find_ifs()[0].find_conditions()[0].is_equivalent("x > 0") # True
explorer1.find_ifs()[0].find_conditions()[1].is_equivalent("x < 0") # True
explorer1.find_ifs()[0].find_conditions()[2] == Node() # True
Node("x = 1").find_conditions() # []

while_str = """
while True:
  x += 1
else:
  return

while False:
  pass
"""
explorer2 = Node(while_str)
explorer2.find_whiles()[0].find_conditions()[0].is_equivalent("True") # True
explorer2.find_whiles()[0].find_conditions()[1] == Node() # True
explorer2.find_whiles()[1].find_conditions()[0].is_equivalent("False") # True
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
explorer.find_for_loops()[0].is_equivalent("for x, y in enumerate(dict):\n  print(x, y)\nelse:\n  pass") # True
explorer.find_for_loops()[1].is_equivalent("for i in range(4):\n  pass") # True
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
explorer.find_for("(x, y)", "enumerate(dict)").is_equivalent("for x, y in enumerate(dict):\n  print(x, y)\nelse:\n  pass") # True
explorer.find_for("i", "range(4)").is_equivalent("for i in range(4):\n  pass") # True
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
explorer.find_for_loops()[0].find_for_vars().is_equivalent("(x, y)") # True
explorer.find_for_loops()[1].find_for_vars().is_equivalent("i") # True
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
explorer.find_for_loops()[0].find_for_iter().is_equivalent("enumerate(dict)") # True
explorer.find_for_loops()[1].find_for_iter().is_equivalent("range(4)") # True
```

#### `find_bodies`

```python
if_str = """
if True:
  x = 1
elif False:
  x = 2
"""
explorer1 = Node(if_str)
explorer1.find_ifs()[0].find_bodies()[0].is_equivalent("x = 1") # True
explorer1.find_ifs()[0].find_bodies()[1].is_equivalent("x = 2") # True

while_str = """
while True:
  x += 1
else:
  x = 0

while False:
  pass
"""
explorer2 = Node(while_str)
explorer2.find_whiles()[0].find_bodies()[0].is_equivalent("x += 1") # True
explorer2.find_whiles()[0].find_bodies()[1].is_equivalent("x = 0") # True
explorer2.find_whiles()[1].find_bodies()[0].is_equivalent("pass") # True

for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    print(x)
    
for i in range(4):
    pass
"""
explorer3 = Node(for_str)
explorer3.find_for_loops()[0].find_bodies()[0].is_equivalent("print(x, y)") # True
explorer3.find_for_loops()[0].find_bodies()[1].is_equivalent("print(x)") # True
explorer3.find_for_loops()[1].find_bodies()[0].is_equivalent("pass") # True
```

#### `find_imports`

```python
code_str = """
import ast, sys
from math import factorial as f
"""

explorer = Node(code_str)
len(explorer.find_imports()) # 2
explorer.find_imports()[0].is_equivalent("import ast, sys")
explorer.find_imports()[1].is_equivalent("from math import factorial as f")
```

#### `find_comps`

Returns a list of list comprehensions, set comprehensions, dictionary comprehensions and generator expressions nodes not assigned to a variable or part of other statements.

```python
code_str = """
[i**2 for i in lst]
(i for i in lst)
{i * j for i in spam for j in lst}
{k: v for k,v in dict}
comp = [i for i in lst]
"""
explorer = Node(code_str)
len(explorer.find_comps()) # 4
explorer.find_comps()[0].is_equivalent("[i**2 for i in lst]")
explorer.find_comps()[1].is_equivalent("(i for i in lst)")
explorer.find_comps()[2].is_equivalent("{i * j for i in spam for j in lst}")
explorer.find_comps()[3].is_equivalent("{k: v for k,v in dict}")
```

#### `find_comp_iters`

Returns a list of comprehension/generator expression iterables. It can be chained to `find_variable`, `find_return`, `find_call_args()[n]`.

```python
code_str = """
x = [i**2 for i in lst]

def foo(spam):
  return [i * j for i in spam for j in lst]
"""
explorer = Node(code_str)
len(explorer.find_variable("x").find_comp_iters()) # 1
explorer.find_variable("x").find_comp_iters()[0].is_equivalent("lst")

len(explorer.find_function("foo").find_return().find_comp_iters()) # 2
explorer.find_function("foo").find_return().find_comp_iters()[0].is_equivalent("spam")
explorer.find_function("foo").find_return().find_comp_iters()[1].is_equivalent("lst")
```

#### `find_comp_targets`

Returns a list of comprhension/generator expression targets (i.e. the iteration variables).

```python
code_str = """
x = [i**2 for i in lst]

def foo(spam):
  return [i * j for i in spam for j in lst]
"""
explorer = Node(code_str)
len(explorer.find_variable("x").find_comp_targets()) # 1
explorer.find_variable("x").find_comp_targets()[0].is_equivalent("i")

len(explorer.find_function("foo").find_return().find_comp_targets()) # 2
explorer.find_function("foo").find_return().find_comp_targets()[0].is_equivalent("i")
explorer.find_function("foo").find_return().find_comp_targets()[1].is_equivalent("j")
```

#### `find_comp_key`

Returns the dictionary comprehension key.

```python
code_str = """
x = {k: v for k,v in dict}

def foo(spam):
  return {k: v for k in spam for v in lst}
"""
explorer = Node(code_str)
explorer.find_variable("x").find_comp_key().is_equivalent("k")

explorer.find_function("foo").find_return().find_comp_key().is_equivalent("k")
```

#### `find_comp_expr`

Returns the expression evaluated at each iteration of comprehensions/generator expressions. It includes the `if`/`else` portion. In case only the `if` is present, use `find_comp_ifs`.

```python
code_str = """
x = [i**2 if i else -1 for i in lst]

def foo(spam):
  return [i * j for i in spam for j in lst]
"""
explorer = Node(code_str)
explorer.find_variable("x").find_comp_expr().is_equivalent("i**2 if i else -1")

explorer.find_function("foo").find_return().find_comp_expr().is_equivalent("i * j")
```

#### `find_comp_ifs`

Returns a list of comprehension/generator expression `if` conditions. The `if`/`else` construct instead is part of the expression and is found with `find_comp_expr`.

```python
code_str = """
x = [i**2 if i else -1 for i in lst]

def foo(spam):
  return [i * j for i in spam if i > 0 for j in lst if j != 6]
"""
explorer = Node(code_str)
len(explorer.find_variable("x").find_comp_ifs()) # 0

len(explorer.find_function("foo").find_return().find_comp_ifs()) # 2
explorer.find_function("foo").find_return().find_comp_ifs()[0].is_equivalent("i > 0")
explorer.find_function("foo").find_return().find_comp_ifs()[1].is_equivalent("j != 6")
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

#### `has_stmt`

Returns a boolean indicating if the specified statement is found.

```python
Node("name = input('hi')\nself.matrix[1][5] = 3").has_stmt("self.matrix[1][5] = 3") # True
```

#### `has_args`

```python
Node("def foo(*, a, b, c=0):\n  pass").find_function("foo").has_args("*, a, b, c=0") # True
```

### `has_pass`

```python
Node("def foo():\n  pass").find_function("foo").has_pass() # True
Node("if x==1:\n  x+=1\nelse:  pass").find_ifs()[0].find_bodies()[1].has_pass() # True
```

#### `has_return`

Returns a boolean indicating if the function returns the specified expression/object.

```python
code_str = """
def foo():
  if x == 1:
    return False
  return True
"""
explorer = Node(code_str)
explorer.find_function("foo").has_return("True") # True
explorer.find_function("foo").find_ifs()[0].has_return("False") # True
```

#### `has_returns`

Returns a boolean indicating if the function has the specified return annotation.

```python
Node("def foo() -> int:\n  return 0").find_function("foo").has_returns("int") # True
Node("def foo() -> 'spam':\n  pass").find_function("foo").has_returns("spam") # True
```

#### `has_decorators`



```python
code_str = """
class A:
  @property
  @staticmethod
  def foo():
    pass
"""
Node(code_str).find_class("A").find_function("foo").has_decorators("property") # True
Node(code_str).find_class("A").find_function("foo").has_decorators("property", "staticmethod") # True
Node(code_str).find_class("A").find_function("foo").has_decorators("staticmethod", "property") # False, order does matter
```

#### `has_call`

```python
code_str = """
print(math.sqrt(25))
if True:
  spam()
"""

explorer = Node(code_str)
explorer.has_call("print(math.sqrt(25))")
explorer.find_ifs()[0].find_bodies()[0].has_call("spam()")
```

#### `has_import`

```python
code_str = """
import ast, sys
from math import factorial as f
"""

explorer = Node(code_str)
explorer.has_import("import ast, sys")
explorer.has_import("from math import factorial as f")
```

#### `has_class`

```python
code_str = """
class spam:
  pass
"""

Node(code_str).has_class("spam")
```

### Misc

#### `is_equivalent`

This is a somewhat loose check. The AST of the target string and the AST of the node do not have to be identical, but the code must be equivalent.

```python
Node("x = 1").is_equivalent("x = 1") # True
Node("\nx = 1").is_equivalent("x =    1") # True
Node("x = 1").is_equivalent("x = 2") # False
```

#### `is_empty`

This is syntactic sugar for `== Node()`.

```python
Node().is_empty() # True
Node("x = 1").find_variable("x").is_empty() # False
```

#### get the nth statement

```python
stmts = """
if True:
  pass

x = 1
"""

Node(stmts)[1].is_equivalent("x = 1") # True
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

#### `inherits_from`

```python
Node("class C(A, B):\n  pass").find_class("C").inherits_from("A") # True
Node("class C(A, B):\n  pass").find_class("C").inherits_from("A", "B") # True
```

#### `is_ordered`

Returs a boolean indicating if the statements passed as arguments are found in the same order in the tree (statements can be non-consecutive)

```python
code_str = """
x = 1
if x:
  print("x is:")
  y = 0
  print(x)
  return y
x = 0
"""

if_str = """
if x:
  print("x is:")
  y = 0
  print(x)
  return y        
"""
explorer = Node(code_str)
explorer.is_ordered("x=1", "x=0") # True
explorer.is_ordered("x=1", if_str, "x=0") # True
explorer.find_ifs()[0].is_ordered("print('x is:')", "print(x)", "return y") # True
explorer.is_ordered("x=0", "x=1") # False
explorer.find_ifs()[0].is_ordered("print(x)", "print('x is:')") # False
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
