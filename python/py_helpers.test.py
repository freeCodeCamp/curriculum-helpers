import unittest
import ast
import sys
from py_helpers import Node, drop_until, build_message, format_exception


class TestConstructor(unittest.TestCase):
    def test_constructor(self):
        node = Node()

        self.assertIsNone(node.tree)

    def test_constructor_with_tree(self):
        tree = ast.parse("def foo():\n  pass")
        node = Node(tree)

        self.assertEqual(node.tree, tree)

    def test_constructor_with_string(self):
        with_string = Node("def foo():\n  pass")
        with_tree = Node(ast.parse("def foo():\n  pass"))

        self.assertEqual(with_string, with_tree)

    def test_constructor_with_anything_else(self):
        self.assertRaises(TypeError, lambda: Node(1))


class TestVariableHelpers(unittest.TestCase):
    def test_find_variable_can_handle_all_asts(self):
        node = Node("x = 1")

        # First find_variable, so know that the AST has no body and we can be
        # sure find_class handles this.
        self.assertEqual(node.find_variable("x").find_variable("x"), Node())

    def test_has_local_variable_in_function(self):
        func_str = """def foo():
  a = 1
  print(a)
  x = 2
"""

        node = Node(func_str)

        self.assertTrue(node.find_function("foo").has_variable("x"))

    def test_has_global_variable(self):
        globals_str = """a = 1
x = 2
"""

        node = Node(globals_str)

        self.assertTrue(node.has_variable("x"))

    def test_does_not_see_local_variables_out_of_scope(self):
        scopes_str = """def foo():
  a = 1
b = 2
"""

        node = Node(scopes_str)
        self.assertFalse(node.has_variable("a"))

    def test_has_variable_attr(self):
        code_str = """
class A:
  def __init__(self, x, y):
    self.x = x
    self.y = y
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_class("A").find_function("__init__").has_variable("self.x")
        )
        self.assertTrue(
            node.find_class("A").find_function("__init__").has_variable("self.y")
        )

    def test_is_integer(self):
        two_locals = """
def foo():
  a = 1
  print(a)
  x = 2
y = 3
"""
        node = Node(two_locals)
        self.assertTrue(node.find_function("foo").find_variable("x").is_integer())
        self.assertFalse(node.find_function("foo").find_variable("y").is_integer())

    def test_none_assignment(self):
        none_str = """
x = None
"""
        node = Node(none_str)

        self.assertTrue(node.has_variable("x"))
        self.assertTrue(node.find_variable("x").is_equivalent("x = None"))

    def test_local_variable_is_integer_with_string(self):
        node = Node('def foo():\n  x = "1"')

        self.assertFalse(node.find_function("foo").find_variable("x").is_integer())

    def test_variable_has_constant_value(self):
        node = Node('def foo():\n  x = "1"')

        self.assertEqual(node.find_function("foo").get_variable("x"), "1")

    def test_find_variable(self):
        node = Node('def foo():\n  x = "1"')

        self.assertTrue(
            node.find_function("foo").find_variable("x").is_equivalent('x = "1"'),
        )

    def test_find_variable_attr(self):
        node = Node("self.x = x")

        self.assertTrue(node.find_variable("self.x").is_equivalent("self.x = x"))

    def test_find_variable_not_found(self):
        node = Node('def foo():\n  x = "1"')

        self.assertEqual(node.find_variable("y"), Node())

    def test_function_call_assigned_to_variable(self):
        node = Node("def foo():\n  x = bar()")

        self.assertTrue(
            node.find_function("foo").find_variable("x").value_is_call("bar")
        )

    def test_function_call_not_assigned_to_variable(self):
        node = Node("def foo():\n  bar()")

        self.assertFalse(node.find_function("foo").value_is_call("bar"))

    def test_find_aug_variable(self):
        node = Node("x += 1")

        self.assertTrue(node.find_aug_variable("x").is_equivalent("x += 1"))

    def test_find_aug_variable_nested(self):
        code_str = """
def foo():
  x = 5
  while x > 0:
    x -= 1
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_function("foo")
            .find_whiles()[0]
            .find_aug_variable("x")
            .is_equivalent("x -= 1")
        )
        self.assertEqual(node.find_function("foo").find_aug_variable("x"), Node())

    def test_find_variables(self):
        code_str = """
x: int = 0
a.b = 0
x = 5
a.b = 2
x = 10
"""
        node = Node(code_str)
        self.assertEqual(len(node.find_variables("x")), 3)
        self.assertTrue(node.find_variables("x")[0].is_equivalent("x: int = 0"))
        self.assertTrue(node.find_variables("x")[1].is_equivalent("x = 5"))
        self.assertTrue(node.find_variables("x")[2].is_equivalent("x = 10"))
        self.assertEqual(len(node.find_variables("a.b")), 2)
        self.assertTrue(node.find_variables("a.b")[0].is_equivalent("a.b = 0"))
        self.assertTrue(node.find_variables("a.b")[1].is_equivalent("a.b = 2"))


class TestFunctionAndClassHelpers(unittest.TestCase):
    def test_find_function_returns_node(self):
        func_str = """def foo():
  pass
"""
        node = Node(func_str)

        self.assertIsInstance(node.find_function("foo"), Node)
        self.assertIsInstance(node.find_function("bar"), Node)

    def test_find_function_can_handle_all_asts(self):
        node = Node("x = 1")

        # First find_variable, so know that the AST has no body and we can be
        # sure find_function handles this.
        self.assertEqual(node.find_variable("x").find_function("foo"), Node())

    def test_parse_creates_node(self):
        node = Node("def foo():\n  pass")

        self.assertIsInstance(node.tree, ast.Module)
        self.assertEqual(ast.dump(node.tree), ast.dump(ast.parse("def foo():\n  pass")))

    def test_find_function_returns_function_ast(self):
        node = Node("def foo():\n  pass")

        func = node.find_function("foo")

        self.assertIsInstance(func.tree, ast.FunctionDef)
        self.assertEqual(func.tree.name, "foo")

    def test_find_function_returns_node_none(self):
        node = Node("def foo():\n  pass")

        func = node.find_function("bar")

        self.assertIsInstance(func, Node)
        self.assertEqual(func.tree, None)

    def test_nested_function(self):
        nested_str = """def foo():
  def bar():
    x = 1
  y = 2
"""

        node = Node(nested_str)

        self.assertTrue(node.find_function("foo").has_variable("y"))
        self.assertFalse(node.find_function("foo").has_variable("x"))
        self.assertTrue(
            node.find_function("foo").find_function("bar").has_variable("x")
        )

    def test_find_functions(self):
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
        node = Node(code_str)

        self.assertEqual(len(node.find_class("Spam").find_functions("foo")), 2)
        self.assertTrue(
            node.find_class("Spam")
            .find_functions("foo")[0]
            .is_equivalent(
                "@property\n@abstractmethod\ndef foo(self):\n  return self.x"
            )
        )
        self.assertTrue(
            node.find_class("Spam")
            .find_functions("foo")[1]
            .is_equivalent(
                "@foo.setter\n@abstractmethod\ndef foo(self, new_x):\n  self.x = new_x"
            )
        )

    def test_has_args(self):
        code_str = """
def foo(*, a, b, c=0):
   pass
"""
        node = Node(code_str)

        self.assertTrue(node.find_function("foo").has_args("*, a, b, c=0"))
        self.assertFalse(node.find_function("foo").has_args("*, a, b, c"))

    def test_find_return(self):
        code_str = """
def foo():
  if x == 1:
    return False
  return True
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_function("foo").find_return().is_equivalent("return True")
        )

    def test_has_return(self):
        code_str = """
def foo():
  if x == 1:
    return False
  return True
"""
        node = Node(code_str)

        self.assertTrue(node.find_function("foo").has_return("True"))
        self.assertTrue(node.find_function("foo").find_ifs()[0].has_return("False"))

    def test_has_args_annotations(self):
        code_str = """
def foo(a: int, b: int) -> int:
   pass
"""
        node = Node(code_str)

        self.assertTrue(node.find_function("foo").has_args("a: int, b: int"))
        self.assertFalse(node.find_function("foo").has_args("a, b"))

    def test_has_returns(self):
        code_str = """
def foo() -> int:
  pass

def spam() -> Dict[str, int]:
  pass
"""
        node = Node(code_str)

        self.assertTrue(node.find_function("foo").has_returns("int"))
        self.assertFalse(node.find_function("foo").has_returns("str"))
        self.assertTrue(node.find_function("spam").has_returns("Dict[str, int]"))

    def test_has_returns_without_returns(self):
        code_str = """
def foo():
   pass
"""
        node = Node(code_str)

        self.assertFalse(node.find_function("foo").has_args("int"))

    def test_find_calls(self):
        code_str = """
print(1)
int("1")
print(2)
foo("spam")
obj.foo("spam")
obj.bar.foo("spam")
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_calls("print")), 2)
        self.assertTrue(node.find_calls("print")[0].is_equivalent("print(1)"))
        self.assertTrue(node.find_calls("print")[1].is_equivalent("print(2)"))
        self.assertEqual(len(node.find_calls("int")), 1)
        self.assertTrue(node.find_calls("int")[0].is_equivalent("int('1')"))
        self.assertEqual(len(node.find_calls("foo")), 3)
        self.assertTrue(node.find_calls("foo")[0].is_equivalent("foo('spam')"))
        self.assertTrue(node.find_calls("foo")[1].is_equivalent("obj.foo('spam')"))
        self.assertTrue(node.find_calls("foo")[2].is_equivalent("obj.bar.foo('spam')"))

    def test_find_call_args(self):
        code_str = """
print(1)
print(2, 3)
obj.foo("spam")
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_calls("print")[0].find_call_args()), 1)
        self.assertTrue(
            node.find_calls("print")[0].find_call_args()[0].is_equivalent("1")
        )
        self.assertEqual(len(node.find_calls("print")[1].find_call_args()), 2)
        self.assertTrue(
            node.find_calls("print")[1].find_call_args()[0].is_equivalent("2")
        )
        self.assertTrue(
            node.find_calls("print")[1].find_call_args()[1].is_equivalent("3")
        )
        self.assertEqual(len(node.find_calls("foo")[0].find_call_args()), 1)
        self.assertTrue(
            node.find_calls("foo")[0].find_call_args()[0].is_equivalent("'spam'")
        )

    def test_has_call(self):
        code_str = """
print(1)
int("1")
print(2)
obj.foo("spam")
"""
        node = Node(code_str)

        self.assertTrue(node.has_call("print(1)"))
        self.assertTrue(node.has_call("print(2)"))
        self.assertTrue(node.has_call("int('1')"))
        self.assertTrue(node.has_call("obj.foo('spam')"))

    def test_block_has_call(self):
        code_str = """

srt = sorted([5, 1, 9])

def foo(lst):
  return sorted(lst)
        
def spam(lst):
  return lst.sort()

def eggs(dictionary):
  if True:
    k = dictionary.get(key)
"""
        node = Node(code_str)

        self.assertFalse(node.block_has_call("sorted", "srt"))
        self.assertTrue(node.block_has_call("sorted", "foo"))
        self.assertTrue(node.block_has_call("sorted"))
        self.assertTrue(node.block_has_call("sort", "spam"))
        self.assertFalse(node.block_has_call("sort", "func"))
        self.assertTrue(node.block_has_call("sort"))
        self.assertTrue(node.block_has_call("get", "eggs"))
        self.assertTrue(node.block_has_call("get"))
        self.assertFalse(node.block_has_call("split"))

    def test_has_class(self):
        class_str = """
class Foo:
  def __init__(self):
    pass
"""
        node = Node(class_str)

        self.assertTrue(node.has_class("Foo"))

    def test_find_class(self):
        class_str = """
class Foo:
  def __init__(self):
    pass
"""

        node = Node(class_str)

        self.assertIsNotNone(node.find_class("Foo"))
        self.assertIsInstance(node.find_class("Foo"), Node)

        self.assertIsInstance(node.find_class("Bar"), Node)
        self.assertEqual(node.find_class("Bar"), Node())

    def test_find_class_can_handle_all_asts(self):
        node = Node("x = 1")

        # First find_variable, so know that the AST has no body and we can be
        # sure find_class handles this.
        self.assertEqual(node.find_variable("x").find_class("Foo"), Node())

    def test_method_exists(self):
        class_str = """
class Foo:
  def __init__(self):
    self.x = 1
  def bar(self):
    pass
"""
        node = Node(class_str)

        self.assertTrue(node.find_class("Foo").has_function("bar"))

    def test_dunder_method_exists(self):
        class_str = """
class Foo:
  def __init__(self):
    self.x = 1
  def bar(self):
    pass
"""
        node = Node(class_str)

        self.assertTrue(node.find_class("Foo").has_function("__init__"))

    def test_not_has_function(self):
        node = Node("def foo():\n  pass")

        self.assertFalse(node.has_function("bar"))

    def test_find_body(self):
        func_str = """def foo():
  x = 1
  print(x)
"""
        node = Node(func_str)

        self.assertTrue(
            node.find_function("foo").find_body().is_equivalent("x = 1\nprint(x)")
        )
        self.assertEqual("x = 1\nprint(x)", str(node.find_function("foo").find_body()))

    def test_find_body_with_class(self):
        class_str = """
class Foo:
  def __init__(self):
    self.x = 1
"""
        node = Node(class_str)

        self.assertTrue(
            node.find_class("Foo")
            .find_body()
            .is_equivalent("def __init__(self):\n    self.x = 1")
        )

    def test_find_body_without_body(self):
        node = Node("x = 1")

        self.assertEqual(node.find_variable("x").find_body(), Node())

    def test_inherits_from(self):
        code_str = """
class A:
   pass

class B(A, C):
   pass
"""
        node = Node(code_str)

        self.assertFalse(node.find_class("A").inherits_from("B"))
        self.assertTrue(node.find_class("B").inherits_from("C", "A"))
        self.assertTrue(node.find_class("B").inherits_from("A"))

    def test_find_method_args(self):
        code_str = """
class A:
  def __init__(self, *, a, b=0):
    self.a = a
    self.b = b
  
  @property
  @staticmethod
  def foo(*, a, b=0):
    pass
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_class("A").find_function("__init__").has_args("self, *, a, b=0")
        )
        self.assertTrue(node.find_class("A").find_function("foo").has_args("*, a, b=0"))

    def test_has_decorators(self):
        code_str = """
class A:
  @property
  @staticmethod
  def foo():
    pass

  def bar():
    pass
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_class("A")
            .find_function("foo")
            .has_decorators("property", "staticmethod")
        )
        self.assertFalse(
            node.find_class("A")
            .find_function("foo")
            .has_decorators("staticmethod", "property")
        )
        self.assertTrue(
            node.find_class("A").find_function("foo").has_decorators("property")
        )
        self.assertFalse(
            node.find_class("A").find_function("bar").has_decorators("property")
        )


class TestAsyncHelpers(unittest.TestCase):
    def test_find_async_function(self):
        code_str = """
async def foo():
  await bar()
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_async_function("foo").is_equivalent(
                "async def foo():\n  await bar()"
            )
        )

    def test_find_async_function_args(self):
        code_str = """
async def foo(spam):
  await bar()
"""
        node = Node(code_str)

        self.assertTrue(node.find_async_function("foo").has_args("spam"))

    def test_find_async_function_return(self):
        code_str = """
async def foo(spam):
  await bar()
  return True
"""
        node = Node(code_str)

        self.assertTrue(node.find_async_function("foo").has_return("True"))

    def test_find_async_function_returns(self):
        code_str = """
async def foo(spam) -> bool:
  await bar()
  return True
"""
        node = Node(code_str)

        self.assertTrue(node.find_async_function("foo").has_returns("bool"))

    def test_find_awaits(self):
        code_str = """
async def foo(spam):
  if spam:
    await spam()
  await bar()
  await func()
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_async_function("foo").find_awaits()), 2)
        self.assertTrue(
            node.find_async_function("foo")
            .find_awaits()[0]
            .is_equivalent("await bar()")
        )
        self.assertTrue(
            node.find_async_function("foo")
            .find_awaits()[1]
            .is_equivalent("await func()")
        )
        self.assertEqual(
            len(node.find_async_function("foo").find_ifs()[0].find_awaits()), 1
        )
        self.assertTrue(
            node.find_async_function("foo")
            .find_ifs()[0]
            .find_awaits()[0]
            .is_equivalent("await spam()")
        )


class TestEquivalenceHelpers(unittest.TestCase):
    def test_is_equivalent(self):
        full_str = """def foo():
  a = 1
  print(a)
def bar():
  x = "1"
  print(x)
"""

        node = Node(full_str)

        expected = """def bar():
  x = "1"
  print(x)
"""

        self.assertTrue(node.find_function("bar").is_equivalent(expected))
        # Obviously, it should be equivalent to itself
        self.assertTrue(
            node.find_function("bar").is_equivalent(
                ast.unparse(node.find_function("bar").tree)
            )
        )

    def test_is_not_equivalent(self):
        full_str = """def foo():
  a = 1
  print(a)
def bar():
  x = "1"
  print(x)
"""
        node = Node(full_str)
        # this should not be equivalent because it contains an extra function

        expected = """def bar():
  x = "1"
  print(x)

def foo():
  a = 1
"""

        self.assertFalse(node.find_function("bar").is_equivalent(expected))

    def test_is_equivalent_with_conditional(self):
        cond_str = """
if True:
  pass
"""

        node = Node(cond_str)
        self.assertTrue(node[0].find_conditions()[0].is_equivalent("True"))

    def test_none_equivalence(self):
        none_str = """
x = None
"""

        node = Node(none_str)
        self.assertIsNone(node.get_variable("x"))
        self.assertFalse(node.find_variable("y").is_equivalent("None"))

    def test_whitespace_equivalence(self):
        str_with_whitespace = """

x = 1
"""
        str_with_different_whitespace = """x   =   1"""
        self.assertTrue(
            Node(str_with_whitespace).is_equivalent(str_with_different_whitespace)
        )

    def test_string_equivalence(self):
        self.assertTrue(Node("'True'").is_equivalent('"""True"""'))

    def test_string_cond_equivalence(self):
        self.assertTrue(
            Node("if 'True':\n  pass")
            .find_ifs()[0]
            .find_conditions()[0]
            .is_equivalent("'True'")
        )


class TestConditionalHelpers(unittest.TestCase):
    def test_find_if_statements(self):
        self.maxDiff = None
        if_str = """
x = 1
if x == 1:
  x = 2

if True:
  pass
"""
        node = Node(if_str)
        # it should return an array of nodes, not a node of an array
        for if_node in node.find_ifs():
            self.assertIsInstance(if_node, Node)
        self.assertNotIsInstance(node.find_ifs(), Node)
        self.assertEqual(len(node.find_ifs()), 2)

        self.assertTrue(node.find_ifs()[0].is_equivalent("if x == 1:\n  x = 2"))
        self.assertTrue(node.find_ifs()[1].is_equivalent("if True:\n  pass"))

    def test_find_conditions(self):
        if_str = """
if True:
  x = 1
else:
  x = 4
"""
        node = Node(if_str)

        # it should return an array of nodes, not a node of an array
        for if_cond in node.find_ifs()[0].find_conditions():
            self.assertIsInstance(if_cond, Node)
        self.assertNotIsInstance(node.find_ifs()[0].find_conditions(), Node)
        self.assertEqual(len(node.find_ifs()[0].find_conditions()), 2)
        self.assertIsNone(node.find_ifs()[0].find_conditions()[1].tree)

    def test_find_conditions_without_if(self):
        node = Node("x = 1")

        self.assertEqual(node.find_conditions(), [])

    def test_find_conditions_only_if(self):
        if_str = """
if True:
  x = 1
"""
        node = Node(if_str)

        self.assertEqual(len(node.find_ifs()[0].find_conditions()), 1)

    def test_find_conditions_elif(self):
        if_str = """
if True:
  x = 1
elif y == 2:
  x = 2
elif not x < 3:
  x = 3
else:
  x = 4
"""
        node = Node(if_str)

        self.assertEqual(len(node.find_ifs()[0].find_conditions()), 4)
        self.assertTrue(node.find_ifs()[0].find_conditions()[0].is_equivalent("True"))
        self.assertTrue(node.find_ifs()[0].find_conditions()[1].is_equivalent("y == 2"))
        self.assertTrue(
            node.find_ifs()[0].find_conditions()[2].is_equivalent("not x < 3")
        )
        self.assertEqual(node.find_ifs()[0].find_conditions()[3].tree, None)
        self.assertRaises(
            IndexError,
            lambda: node.find_ifs()[0].find_conditions()[4],
        )

    def test_find_if_bodies(self):
        if_str = """
if True:
  x = 1
"""
        node = Node(if_str)

        self.assertEqual(len(node.find_ifs()[0].find_bodies()), 1)
        self.assertTrue(node.find_ifs()[0].find_bodies()[0].is_equivalent("x = 1"))

    def test_find_if_bodies_elif(self):
        if_str = """
if True:
  x = 1
elif y == 2:
  x = 2
elif True:
  x = 3
else:
  x = 4
"""
        node = Node(if_str)

        self.assertEqual(len(node.find_ifs()[0].find_bodies()), 4)
        self.assertTrue(node.find_ifs()[0].find_bodies()[0].is_equivalent("x = 1"))
        self.assertTrue(node.find_ifs()[0].find_bodies()[1].is_equivalent("x = 2"))
        self.assertTrue(node.find_ifs()[0].find_bodies()[2].is_equivalent("x = 3"))
        self.assertTrue(node.find_ifs()[0].find_bodies()[3].is_equivalent("x = 4"))
        self.assertRaises(IndexError, lambda: node.find_ifs()[0].find_bodies()[4])

    def test_find_if_bodies_without_if(self):
        node = Node("x = 1")

        self.assertEqual(len(node.find_bodies()), 0)

    def test_find_specific_if(self):
        if_str = """
if True:
  x = 1
elif y == 2:
  x = 2
elif False:
  x = 3
else:
  x = 4
"""
        node = Node(if_str)

        self.assertTrue(node.find_if("True"))
        self.assertIsNone(node.find_if("False").tree)
        self.assertTrue(node.find_if("True").find_bodies()[0].is_equivalent("x = 1"))
        self.assertTrue(node.find_if("True").find_bodies()[1].is_equivalent("x = 2"))
        self.assertTrue(node.find_if("True").find_bodies()[2].is_equivalent("x = 3"))
        self.assertTrue(node.find_if("True").find_bodies()[3].is_equivalent("x = 4"))


class TestWhileLoopsHelpers(unittest.TestCase):
    def test_find_while_statements(self):
        self.maxDiff = None
        while_str = """
x = 10
while x > 0:
  x -= 1

while x <= 0:
  x += 1
"""

        node = Node(while_str)

        for while_node in node.find_whiles():
            self.assertIsInstance(while_node, Node)
        self.assertNotIsInstance(node.find_whiles(), Node)
        self.assertEqual(len(node.find_whiles()), 2)

        self.assertTrue(node.find_whiles()[0].is_equivalent("while x > 0:\n  x -= 1"))
        self.assertTrue(node.find_whiles()[1].is_equivalent("while x <= 0:\n  x += 1"))

    def test_while_conditions(self):
        while_str = """
x = 10
while x > 0:
  x -= 1
else:
  pass
"""
        node = Node(while_str)

        for while_cond in node.find_whiles()[0].find_conditions():
            self.assertIsInstance(while_cond, Node)
        self.assertNotIsInstance(node.find_whiles()[0].find_conditions(), Node)
        self.assertEqual(len(node.find_whiles()[0].find_conditions()), 2)

        self.assertTrue(
            node.find_whiles()[0].find_conditions()[0].is_equivalent("x > 0")
        )
        self.assertIsNone(node.find_whiles()[0].find_conditions()[1].tree)

    def test_while_bodies(self):
        while_str = """
x = 10
while x > 0:
  x -= 1

while x <= 0:
  x += 1
else:
  x = 6
"""
        node = Node(while_str)

        self.assertEqual(len(node.find_whiles()[0].find_bodies()), 1)
        self.assertEqual(len(node.find_whiles()[1].find_bodies()), 2)
        self.assertTrue(node.find_whiles()[0].find_bodies()[0].is_equivalent("x -= 1"))
        self.assertTrue(node.find_whiles()[1].find_bodies()[0].is_equivalent("x += 1"))
        self.assertTrue(node.find_whiles()[1].find_bodies()[1].is_equivalent("x = 6"))

    def test_find_specific_while(self):
        while_str = """
x = 10
while x > 0:
  x -= 1

while x <= 0:
  x += 1
else:
  x = 6
"""
        node = Node(while_str)

        self.assertTrue(node.find_while("x > 0"))
        self.assertTrue(node.find_while("x <= 0"))
        self.assertTrue(
            node.find_while("x > 0").find_bodies()[0].is_equivalent("x -= 1")
        )
        self.assertTrue(
            node.find_while("x <= 0").find_bodies()[0].is_equivalent("x += 1")
        )


class TestStructuralPatternMatching(unittest.TestCase):
    def test_find_matches(self):
        self.maxDiff = None
        code_str = """
match x:
  case 0:
    pass
  case _:
    pass
    
match y:
  case 0:
    pass
  case _:
    pass
"""

        node = Node(code_str)
        self.assertEqual(len(node.find_matches()), 2)
        self.assertTrue(
            node.find_matches()[0].is_equivalent(
                "match x:\n  case 0:\n    pass\n  case _:\n    pass"
            )
        )
        self.assertTrue(
            node.find_matches()[1].is_equivalent(
                "match y:\n  case 0:\n    pass\n  case _:\n    pass"
            )
        )

    def test_find_match_subject(self):
        self.maxDiff = None
        code_str = """
match x:
  case 0:
    pass
  case _:
    pass
    
match y:
  case 0:
    pass
  case _:
    pass
"""

        node = Node(code_str)
        self.assertTrue(node.find_matches()[0].find_match_subject().is_equivalent("x"))
        self.assertTrue(node.find_matches()[1].find_match_subject().is_equivalent("y"))

    def test_find_match_cases(self):
        self.maxDiff = None
        code_str = """
match x:
  case 0:
    pass
  case [a, b]:
    pass  
  case _:
    pass
"""

        node = Node(code_str)
        self.assertEqual(len(node.find_matches()[0].find_match_cases()), 3)
        self.assertEqual(
            str(node.find_matches()[0].find_match_cases()[0]), "case 0:\n    pass"
        )
        self.assertEqual(
            str(node.find_matches()[0].find_match_cases()[1]), "case [a, b]:\n    pass"
        )
        self.assertEqual(
            str(node.find_matches()[0].find_match_cases()[2]), "case _:\n    pass"
        )

    def test_find_case_pattern(self):
        self.maxDiff = None
        code_str = """
match x:
  case 0 if y > 0:
    pass
  case [a, b]:
    pass  
  case _:
    pass
"""

        node = Node(code_str)
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[0]
            .find_case_pattern()
            .is_equivalent("0")
        )
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[1]
            .find_case_pattern()
            .is_equivalent("[a, b]")
        )
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[2]
            .find_case_pattern()
            .is_equivalent("_")
        )

    def test_find_case_guard(self):
        self.maxDiff = None
        code_str = """
match x:
  case 0 if y > 0:
    pass
  case [a, b] if y == -1:
    pass  
  case _:
    pass
"""

        node = Node(code_str)
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[0]
            .find_case_guard()
            .is_equivalent("y > 0")
        )
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[1]
            .find_case_guard()
            .is_equivalent("y == -1")
        )
        self.assertTrue(
            node.find_matches()[0].find_match_cases()[2].find_case_guard().is_empty()
        )

    def test_find_case_body(self):
        self.maxDiff = None
        code_str = """
match x:
  case 0:
    print(0)
    print('spam')
  case [a, b]:
    print(a, b)  
  case _:
    pass
"""

        node = Node(code_str)
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[0]
            .find_case_body()
            .is_equivalent("print(0)\nprint('spam')")
        )
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[1]
            .find_case_body()
            .is_equivalent("print(a, b)")
        )
        self.assertTrue(
            node.find_matches()[0]
            .find_match_cases()[2]
            .find_case_body()
            .is_equivalent("pass")
        )


class TestForLoopsHelpers(unittest.TestCase):
    def test_find_for_statements(self):
        self.maxDiff = None
        for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    pass

for i in range(4):
    pass
"""
        node = Node(for_str)

        for for_loop in node.find_for_loops():
            self.assertIsInstance(for_loop, Node)
        self.assertNotIsInstance(node.find_for_loops(), Node)
        self.assertEqual(len(node.find_for_loops()), 2)

        self.assertTrue(
            node.find_for_loops()[0].is_equivalent(
                "for x, y in enumerate(dict):\n  print(x, y)\nelse:\n  pass"
            )
        )
        self.assertTrue(
            node.find_for_loops()[1].is_equivalent("for i in range(4):\n  pass")
        )

    def test_find_for_vars(self):
        self.maxDiff = None
        for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    pass

for i in range(4):
    pass
"""

        node = Node(for_str)

        self.assertIsInstance(node.find_for_loops()[0].find_for_vars(), Node)
        self.assertIsInstance(node.find_for_loops()[1].find_for_vars(), Node)

        self.assertTrue(
            node.find_for_loops()[0].find_for_vars().is_equivalent("(x, y)")
        )
        self.assertTrue(node.find_for_loops()[1].find_for_vars().is_equivalent("i"))

    def test_find_for_iter(self):
        self.maxDiff = None
        for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)

for i in range(4):
    pass
"""

        node = Node(for_str)

        self.assertTrue(
            node.find_for_loops()[0].find_for_iter().is_equivalent("enumerate(dict)")
        )
        self.assertTrue(
            node.find_for_loops()[1].find_for_iter().is_equivalent("range(4)")
        )

    def test_find_for_bodies(self):
        self.maxDiff = None
        for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x, y)
else:
    print("Hi")

for i in range(4):
    pass
"""

        node = Node(for_str)

        self.assertEqual(len(node.find_for_loops()[0].find_bodies()), 2)
        self.assertTrue(
            node.find_for_loops()[0].find_bodies()[0].is_equivalent("print(x, y)")
        )
        self.assertTrue(
            node.find_for_loops()[0].find_bodies()[1].is_equivalent('print("Hi")')
        )
        self.assertTrue(node.find_for_loops()[1].find_bodies()[0].is_equivalent("pass"))

    def test_find_specific_for(self):
        for_str = """
dict = {'a': 1, 'b': 2, 'c': 3}
for x, y in enumerate(dict):
    print(x)
else:
    print("Hi")

for i in range(4):
    print(i)
"""
        node = Node(for_str)

        self.assertTrue(node.find_for("(x,y)", "enumerate(dict)"))
        self.assertTrue(node.find_for("i", "range(4)"))
        self.assertIsNone(node.find_for("x", "dict").tree)
        self.assertTrue(
            node.find_for("(x,y)", "enumerate(dict)")
            .find_bodies()[0]
            .is_equivalent("print(x)")
        )
        self.assertTrue(
            node.find_for("i", "range(4)").find_bodies()[0].is_equivalent("print(i)")
        )


class TestNestedLoopsAndConditionalHelpers(unittest.TestCase):
    def test_find_bodies_nested(self):
        code_str = """
while True:
    for i in range(5):
        if i == 0:
            continue
        elif i == 1:
            pass
        else:
            x += i
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .is_equivalent(
                "for i in range(5):\n  if i==0:\n    continue\n  elif i==1:\n    pass\n  else:\n    x+=i"
            )
        )
        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_for_loops()[0]
            .find_bodies()[0]
            .is_equivalent("if i==0:\n  continue\nelif i==1:\n  pass\nelse:\n  x+=i")
        )
        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_for_loops()[0]
            .find_bodies()[0]
            .find_ifs()[0]
            .find_bodies()[0]
            .is_equivalent("continue")
        )
        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_for_loops()[0]
            .find_bodies()[0]
            .find_ifs()[0]
            .find_bodies()[1]
            .is_equivalent("pass")
        )
        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_for_loops()[0]
            .find_bodies()[0]
            .find_ifs()[0]
            .find_bodies()[2]
            .is_equivalent("x+=i")
        )

    def test_find_bodies_nested_ifs(self):
        code_str = """if x == 1:
  pass
elif x == 2:
  if True:
    pass"""
        node = Node(code_str)

        node.find_ifs()[0].find_bodies()[1].is_equivalent("if True:\n  pass")

    def test_find_conditions_nested(self):
        code_str = """
while True:
    if i == 0:
        continue
    elif i == 1:
        pass
    else:
        x += i
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_whiles()[0].find_conditions()[0].is_equivalent("True")
        )
        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_ifs()[0]
            .find_conditions()[0]
            .is_equivalent("i==0")
        )
        self.assertTrue(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_ifs()[0]
            .find_conditions()[1]
            .is_equivalent("i==1")
        )
        self.assertIsNone(
            node.find_whiles()[0]
            .find_bodies()[0]
            .find_ifs()[0]
            .find_conditions()[2]
            .tree
        )

    def test_find_conditions_nested_ifs(self):
        code_str = """
if x > 0:
  if x == 1:
    pass
elif x < 0:
  if x == -1:
    pass
else:
  if y:
    return y
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_ifs()[0]
            .find_ifs()[0]
            .find_conditions()[0]
            .is_equivalent("x == 1")
        )
        self.assertTrue(
            node.find_ifs()[0]
            .find_bodies()[1]
            .find_ifs()[0]
            .find_conditions()[0]
            .is_equivalent("x == -1")
        )

        # if x: pass
        # else:
        #   if y: return y

        # is equivalent to

        # if x: pass
        # elif y: return y
        self.assertTrue(node.find_ifs()[0].find_conditions()[2].is_equivalent("y"))


class TestPassHelpers(unittest.TestCase):
    def test_has_pass(self):
        code_str = """
if x == 1:
    pass
elif x == 2:
    x += 1
else:
    pass
"""
        node = Node(code_str)

        self.assertFalse(node.find_ifs()[0].has_pass())
        self.assertTrue(node.find_ifs()[0].find_bodies()[0].has_pass())
        self.assertFalse(node.find_ifs()[0].find_bodies()[1].has_pass())
        self.assertTrue(node.find_ifs()[0].find_bodies()[2].has_pass())


class TestImportHelpers(unittest.TestCase):
    def test_find_imports(self):
        code_str = """
import ast
from py_helpers import Node as _Node
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_imports()), 2)

    def test_has_import(self):
        code_str = """
import ast
from py_helpers import Node as _Node
"""
        node = Node(code_str)

        self.assertTrue(node.has_import("import ast"))
        self.assertTrue(node.has_import("from py_helpers import Node as _Node"))


class TestComprehensionHelpers(unittest.TestCase):
    def test_find_comps(self):
        code_str = """
[i**2 for i in lst]
(i for i in lst)
{i * j for i in spam for j in lst}
{k: v for k,v in dict}
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_comps()), 4)
        self.assertTrue(node.find_comps()[0].is_equivalent("[i**2 for i in lst]"))
        self.assertTrue(node.find_comps()[1].is_equivalent("(i for i in lst)"))
        self.assertTrue(
            node.find_comps()[2].is_equivalent("{i * j for i in spam for j in lst}")
        )
        self.assertTrue(node.find_comps()[3].is_equivalent("{k: v for k,v in dict}"))

    def test_find_comp_iters(self):
        code_str = """
x = [i**2 for i in lst]

def foo(spam):
  return [i * j for i in spam for j in lst]
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_variable("x").find_comp_iters()), 1)
        self.assertTrue(
            node.find_variable("x").find_comp_iters()[0].is_equivalent("lst")
        )
        self.assertEqual(
            len(node.find_function("foo").find_return().find_comp_iters()), 2
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_iters()[0]
            .is_equivalent("spam")
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_iters()[1]
            .is_equivalent("lst")
        )

    def test_find_comp_targets(self):
        code_str = """
x = [i**2 for i in lst]

def foo(spam):
  return [i * j for i in spam for j in lst]
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_variable("x").find_comp_targets()), 1)
        self.assertTrue(
            node.find_variable("x").find_comp_targets()[0].is_equivalent("i")
        )
        self.assertEqual(
            len(node.find_function("foo").find_return().find_comp_targets()), 2
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_targets()[0]
            .is_equivalent("i")
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_targets()[1]
            .is_equivalent("j")
        )

    def test_find_comp_key(self):
        code_str = """
x = {k: v for k,v in dict}

def foo(spam):
  return {k: v for k in spam for v in lst}
"""
        node = Node(code_str)

        self.assertTrue(node.find_variable("x").find_comp_key().is_equivalent("k"))
        self.assertTrue(
            node.find_function("foo").find_return().find_comp_key().is_equivalent("k")
        )

    def test_find_comp_expr(self):
        code_str = """
x = [i**2 if i else -1 for i in lst]

def foo(spam):
  return [i * j for i in spam for j in lst]
"""
        node = Node(code_str)

        self.assertTrue(
            node.find_variable("x").find_comp_expr().is_equivalent("i**2 if i else -1")
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_expr()
            .is_equivalent("i*j")
        )

    def test_find_comp_ifs(self):
        code_str = """
x = [i**2 if i else -1 for i in lst]

def foo(spam):
  return [i * j for i in spam if i for j in lst if j]
"""
        node = Node(code_str)

        self.assertEqual(len(node.find_variable("x").find_comp_ifs()), 0)
        self.assertEqual(
            len(node.find_function("foo").find_return().find_comp_ifs()), 2
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_ifs()[0]
            .is_equivalent("i")
        )
        self.assertTrue(
            node.find_function("foo")
            .find_return()
            .find_comp_ifs()[1]
            .is_equivalent("j")
        )


class TestGenericHelpers(unittest.TestCase):
    def test_is_ordered(self):
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
        self.assertTrue(Node(code_str).is_ordered("x=1", "x=0"))
        self.assertTrue(Node(code_str).is_ordered("x=1", if_str, "x=0"))
        self.assertTrue(
            Node(code_str)
            .find_ifs()[0]
            .is_ordered("print('x is:')", "print(x)", "return y")
        )
        self.assertFalse(Node(code_str).is_ordered("x=0", "x=1"))
        self.assertFalse(
            Node(code_str).find_ifs()[0].is_ordered("print(x)", "print('x is:')")
        )
        self.assertFalse(Node(code_str).is_ordered("x=1", "x=0", "y=0"))

    def test_has_stmt(self):
        self.assertTrue(
            Node("name = input('hi')\nself.matrix[1][5] = 3").has_stmt(
                "self.matrix[1][5] = 3"
            )
        )

    def test_is_empty(self):
        self.assertTrue(Node().is_empty())
        self.assertFalse(Node("x = 1").is_empty())

    def test_else_is_empty(self):
        node = Node("if True:\n  pass\nelse:\n  pass")
        self.assertTrue(node.find_ifs()[0].find_conditions()[1].is_empty())

    def test_equality(self):
        self.assertEqual(
            Node("def foo():\n  pass"),
            Node("def foo():\n  pass"),
        )
        self.assertNotEqual(
            Node("def foo():\n  pass"),
            Node("def bar():\n  pass"),
        )

    def test_strict_equality(self):
        self.assertNotEqual(
            Node("def foo():\n  pass"),
            Node("def foo():\n   pass"),
        )

    def test_not_equal_to_non_node(self):
        self.assertIsNotNone(Node("def foo():\n  pass"))
        self.assertNotEqual(Node(), 1)

    def test_find_nth_statement(self):
        func_str = """
if True:
  pass

x = 1
"""
        node = Node(func_str)

        self.assertTrue(node[0].is_equivalent("if True:\n  pass"))
        self.assertTrue(node[1].is_equivalent("x = 1"))

    def test_indexing_empty_node(self):
        node = Node()
        self.assertRaises(IndexError, lambda: node[0])
        self.assertRaises(IndexError, lambda: node[1])

    def test_raise_exception_if_out_of_bounds(self):
        one_stmt_str = """
if True:
  pass
"""

        node = Node(one_stmt_str)
        self.assertRaises(IndexError, lambda: node[1])

    def test_len_of_body(self):
        func_str = """
if True:
  pass
"""

        node = Node(func_str)

        self.assertEqual(len(node), 1)

    def test_len(self):
        ifs_str = """
if True:
  pass

if True:
  pass
"""

        node = Node(ifs_str)

        self.assertEqual(len(node.find_ifs()), 2)

    def test_len_none_node(self):
        self.assertEqual(len(Node()), 0)

    def test_len_node_without_body(self):
        self.assertEqual(len(Node("x = 1").find_variable("x")), 1)

    def test_str(self):
        func_str = """def foo():
  pass
"""
        # Note: the indentation and whitespace is not preserved.
        expected = """def foo():
    pass"""

        self.assertEqual(expected, str(Node(func_str)))

    def test_none_str(self):
        self.assertEqual("# no ast", str(Node()))

    def test_str_with_comments(self):
        func_str = """def foo():
  # comment
  pass


"""
        # Note: comments are discarded
        expected = """def foo():
    pass"""

        self.assertEqual(expected, str(Node(func_str)))

    def test_repr(self):
        func_str = """def foo():
  pass
"""
        node = Node(func_str)

        self.assertEqual(repr(node), "Node:\n" + ast.dump(node.tree, indent=2))


class TestErrorFormatter(unittest.TestCase):
    def setUp(self):
        self.maxDiff = None
        self.traceback_list = [
            '  File "/lib/python311.zip/_pyodide/_base.py", line 468, in eval_code\n',
            "    .run(globals, locals)\n",
            "     ^^^^^^^^^^^^^^^^^^^^\n",
            '  File "/lib/python311.zip/_pyodide/_base.py", line 310, in run\n',
            "    coroutine = eval(self.code, globals, locals)\n",
            "                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
            '  File "<exec>", line 9, in <module>\n',
            '  File "<exec>", line 7, in nest\n',
            '  File "/lib/python311.zip/traceback.py", line 138, in format_exception\n',
            "    value, tb = _parse_value_tb(exc, value, tb)\n",
            "                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
            '  File "/lib/python311.zip/traceback.py", line 98, in _parse_value_tb\n',
            '    raise ValueError("Both or neither of value and tb must be given")\n',
        ]
        self.exception_only = [
            "ValueError: Both or neither of value and tb must be given\n"
        ]
        self.formatted_exception = "".join(
            [
                "Traceback (most recent call last):\n",
                '  File "<exec>", line 9, in <module>\n',
                '  File "<exec>", line 7, in nest\n',
                '  File "/lib/python311.zip/traceback.py", line 138, in format_exception\n',
                "    value, tb = _parse_value_tb(exc, value, tb)\n",
                "                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
                '  File "/lib/python311.zip/traceback.py", line 98, in _parse_value_tb\n',
                '    raise ValueError("Both or neither of value and tb must be given")\n',
                "ValueError: Both or neither of value and tb must be given\n",
            ]
        )

    def test_drop_until(self):
        self.assertListEqual(
            drop_until(traces=self.traceback_list, filename="<exec>"),
            [
                '  File "<exec>", line 9, in <module>\n',
                '  File "<exec>", line 7, in nest\n',
                '  File "/lib/python311.zip/traceback.py", line 138, in format_exception\n',
                "    value, tb = _parse_value_tb(exc, value, tb)\n",
                "                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
                '  File "/lib/python311.zip/traceback.py", line 98, in _parse_value_tb\n',
                '    raise ValueError("Both or neither of value and tb must be given")\n',
            ],
        )

    def test_drop_until_missing_filename(self):
        self.assertListEqual(
            drop_until(traces=self.traceback_list, filename="<not-here>"),
            [],
        )

    def test_build_message(self):
        trimmed_trace = drop_until(traces=self.traceback_list, filename="<exec>")
        self.assertEqual(
            build_message(traces=trimmed_trace, exception_list=self.exception_only),
            self.formatted_exception,
        )

    def test_format_exception(self):
        code = """
def nest():
    raise ValueError("This error has no value")
nest()
"""
        expected_str = """Traceback (most recent call last):
  File "<string>", line 4, in <module>
  File "<string>", line 3, in nest
ValueError: This error has no value
"""
        try:
            exec(code)
        except Exception:
            _last_type, last_value, last_traceback = sys.exc_info()
            formatted_exception = format_exception(
                exception=last_value, traceback=last_traceback, filename="<string>"
            )
            self.assertEqual(formatted_exception, expected_str)

    def test_format_syntax_error(self):
        code = """
def
"""
        expected_str = """Traceback (most recent call last):
  File "<string>", line 2
    def
       ^
SyntaxError: invalid syntax
"""
        try:
            exec(code)
        except Exception:
            _last_type, last_value, last_traceback = sys.exc_info()

            formatted_exception = format_exception(
                exception=last_value, traceback=last_traceback, filename="<string>"
            )
            self.assertEqual(formatted_exception, expected_str)

    def test_format_and_rename(self):
        code = """
def nest():
    raise ValueError("This error has no value")
nest()
"""
        expected_str = """Traceback (most recent call last):
  File "main.py", line 4, in <module>
  File "main.py", line 3, in nest
ValueError: This error has no value
"""

        try:
            exec(code)
        except Exception:
            _last_type, last_value, last_traceback = sys.exc_info()
            formatted_exception = format_exception(
                exception=last_value,
                traceback=last_traceback,
                filename="<string>",
                new_filename="main.py",
            )
            self.assertEqual(formatted_exception, expected_str)

    def test_format_and_rename_syntax_error(self):
        code = "var ="
        expected_str = """Traceback (most recent call last):
  File "main.py", line 1
    var =
         ^
SyntaxError: invalid syntax
"""

        try:
            exec(code)
        except Exception:
            _last_type, last_value, last_traceback = sys.exc_info()
            formatted_exception = format_exception(
                exception=last_value,
                traceback=last_traceback,
                filename="<string>",
                new_filename="main.py",
            )
            self.assertEqual(formatted_exception, expected_str)

    def test_replaces_only_start_of_line(self):
        code = """
def nest():
    raise ValueError("This error has no value")
nest()
"""
        expected_str = """Traceback (most recent call last):
  File "main.py", line 4, in <module>
  File "main.py", line 3, in nest
ValueError: This error has no value
"""

        try:
            codeObject = compile(code, "line", "exec")
            # When using compiled code, we need to pass an empty dictionary
            # or else the code will be executed in the current scope.
            exec(codeObject, dict())
        except Exception:
            _last_type, last_value, last_traceback = sys.exc_info()

            formatted_exception = format_exception(
                exception=last_value,
                traceback=last_traceback,
                filename="line",
                new_filename="main.py",
            )

            self.assertEqual(formatted_exception, expected_str)


if __name__ == "__main__":
    unittest.main()
