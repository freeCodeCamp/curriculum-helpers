import unittest
import ast
from py_helpers import Chainable


class TestVariableHelpers(unittest.TestCase):
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

    def test_variable_has_constant_value(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertEqual(chainable.find_function("foo").get_variable("x"), "1")

    def test_find_variable(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertTrue(
            chainable.find_function("foo")
            .find_variable("x")
            .is_equivalent(ast.parse('x = "1"')),
        )

    def test_function_call_assigned_to_variable(self):
        chainable = Chainable().parse("def foo():\n  x = bar()")

        self.assertTrue(
            chainable.find_function("foo").find_variable("x").value_is_call("bar")
        )

    def test_function_call_not_assigned_to_variable(self):
        chainable = Chainable().parse("def foo():\n  bar()")

        self.assertFalse(chainable.find_function("foo").value_is_call("bar"))


class TestFunctionAndClassHelpers(unittest.TestCase):
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


class TestEquivalenceHelpers(unittest.TestCase):
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


class TestConditionalHelpers(unittest.TestCase):
    def test_find_if_statements(self):
        self.maxDiff = None
        if_str = """
x = 1
if x == 1:
  x = 2

if x == 2:
  pass
"""
        just_ifs_str = """
if x == 1:
  x = 2

if x == 2:
  pass
"""

        chainable = Chainable().parse(if_str)
        self.assertEqual(
            ast.dump(chainable.find_ifs().tree),
            ast.dump(ast.parse(just_ifs_str)),
        )
        self.assertTrue(
            chainable.find_ifs()
            .find_nth(0)
            .is_equivalent(ast.parse("if x == 1:\n  x = 2"))
        )

    def test_find_conditions(self):
        if_str = """
if True:
  x = 1
else:
  x = 4
"""
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs().find_nth(0).find_conditions()), 2)
        self.assertIsNone(chainable.find_ifs().find_nth(0).find_conditions().tree[1])

    def test_find_conditions_only_if(self):
        if_str = """
if True:
  x = 1
"""
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs().find_nth(0).find_conditions()), 1)

    def test_find_conditions_elif(self):
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
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs().find_nth(0).find_conditions()), 4)


class TestGenericHelpers(unittest.TestCase):
    def test_find_nth_statement(self):
        func_str = """
if True:
  pass

x = 1
"""
        chainable = Chainable().parse(func_str)

        self.assertTrue(
            chainable.find_nth(0).is_equivalent(ast.parse("if True:\n  pass"))
        )
        self.assertTrue(chainable.find_nth(1).is_equivalent(ast.parse("x = 1")))

    def test_len_of_body(self):
        func_str = """
if True:
  pass
"""

        chainable = Chainable().parse(func_str)

        self.assertEqual(len(chainable), 1)

    def test_len(self):
        ifs_str = """
if True:
  pass

if True:
  pass
"""

        chainable = Chainable().parse(ifs_str)

        self.assertEqual(len(chainable.find_ifs()), 2)


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestVariableHelpers))
    suite.addTest(unittest.makeSuite(TestFunctionAndClassHelpers))
    suite.addTest(unittest.makeSuite(TestEquivalenceHelpers))
    suite.addTest(unittest.makeSuite(TestConditionalHelpers))
    suite.addTest(unittest.makeSuite(TestGenericHelpers))
    return suite


if __name__ == "__main__":
    runner = unittest.TextTestRunner()
    runner.run(suite())
