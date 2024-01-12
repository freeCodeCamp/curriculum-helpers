import unittest
import ast
from py_helpers import Chainable


class TestStringMethods(unittest.TestCase):
    def test_parse_creates_chainable(self):
        chainable = Chainable().parse("def foo():\n  pass")

        self.assertTrue(isinstance(chainable.tree, ast.Module))
        self.assertEqual(
            ast.dump(chainable.tree), ast.dump(ast.parse("def foo():\n  pass"))
        )

    def test_find_function_returns_function_ast(self):
        chainable = Chainable().parse("def foo():\n  pass")

        func = chainable.find_function("foo")

        self.assertTrue(isinstance(func.tree, ast.FunctionDef))
        self.assertEqual(func.tree.name, "foo")

    def test_find_function_returns_none(self):
        chainable = Chainable().parse("def foo():\n  pass")

        func = chainable.find_function("bar")

        self.assertEqual(func, None)

    def test_has_local_variable_in_function(self):
        func_str = """def foo():
  a = 1
  print(a)
  x = 2
"""

        chainable = Chainable().parse(func_str)

        self.assertTrue(chainable.find_function("foo").has_variable("x"))

    def test_has_global_variable(self):
        globals_str = """a = 1
x = 2
"""

        chainable = Chainable().parse(globals_str)

        self.assertTrue(chainable.has_variable("x"))

    def test_does_not_see_local_variables_out_of_scope(self):
        scopes_str = """def foo():
  a = 1
b = 2
"""

        chainable = Chainable().parse(scopes_str)

        self.assertFalse(chainable.has_variable("a"))

    def test_nested_function(self):
        nested_str = """def foo():
  def bar():
    x = 1
  y = 2
"""

        chainable = Chainable().parse(nested_str)

        self.assertTrue(chainable.find_function("foo").has_variable("y"))
        self.assertFalse(chainable.find_function("foo").has_variable("x"))
        self.assertTrue(
            chainable.find_function("foo").find_function("bar").has_variable("x")
        )

    def test_is_equivalent(self):
        full_str = """def foo():
  a = 1
  print(a)
def bar():
  x = "1"
  print(x)
"""

        chainable = Chainable().parse(full_str)

        expected = ast.parse(
            """def bar():
  x = "1"
  print(x)
"""
        )

        self.assertTrue(chainable.find_function("bar").is_equivalent(expected))
        # Obviously, it should be equivalent to itself
        self.assertTrue(
            chainable.find_function("bar").is_equivalent(
                chainable.find_function("bar").tree
            )
        )
        # It should also be equivalent to the FunctionDef node itself
        self.assertTrue(chainable.find_function("bar").is_equivalent(expected.body[0]))

    def test_is_not_equivalent(self):
        full_str = """def foo():
  a = 1
  print(a)
def bar():
  x = "1"
  print(x)
"""
        chainable = Chainable().parse(full_str)
        # this should not be equivalent because it contains an extra function

        expected = ast.parse(
            """def bar():
  x = "1"
  print(x)

def foo():
  a = 1
"""
        )

        self.assertFalse(chainable.find_function("bar").is_equivalent(expected))

    def test_local_variable_is_integer(self):
        two_locals = """
def foo():
  a = 1
  print(a)
  x = 2
"""
        chainable = Chainable().parse(two_locals)

        self.assertTrue(chainable.find_function("foo").variable_is_integer("x"))
        self.assertFalse(chainable.find_function("foo").variable_is_integer("y"))

    def test_local_variable_is_integer_with_string(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertFalse(chainable.find_function("foo").variable_is_integer("x"))


    def test_method_exists(self):
        class_str = """
class Foo:
  def __init__(self):
    self.x = 1
  def bar(self):
    pass
"""
        chainable = Chainable().parse(class_str)

        self.assertTrue(chainable.find_class("Foo").has_function("bar"))


if __name__ == "__main__":
    unittest.main()
