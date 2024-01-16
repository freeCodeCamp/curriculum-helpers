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

    def test_is_integer(self):
        two_locals = """
def foo():
  a = 1
  print(a)
  x = 2
y = 3
"""
        chainable = Chainable().parse(two_locals)
        self.assertTrue(chainable.find_function("foo").find_variable("x").is_integer())
        self.assertFalse(chainable.find_function("foo").find_variable("y").is_integer())

    def test_none_assignment(self):
        none_str = """
x = None
"""
        chainable = Chainable().parse(none_str)

        self.assertTrue(chainable.has_variable("x"))
        self.assertTrue(chainable.find_variable("x").is_equivalent("x = None"))

    def test_local_variable_is_integer_with_string(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertFalse(chainable.find_function("foo").find_variable("x").is_integer())

    def test_variable_has_constant_value(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertEqual(chainable.find_function("foo").get_variable("x"), "1")

    def test_find_variable(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertTrue(
            chainable.find_function("foo").find_variable("x").is_equivalent('x = "1"'),
        )

    def test_find_variable_not_found(self):
        chainable = Chainable().parse('def foo():\n  x = "1"')

        self.assertEqual(chainable.find_variable("y").tree, None)

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

        expected = """def bar():
  x = "1"
  print(x)
"""

        self.assertTrue(chainable.find_function("bar").is_equivalent(expected))
        # Obviously, it should be equivalent to itself
        self.assertTrue(
            chainable.find_function("bar").is_equivalent(
                ast.unparse(chainable.find_function("bar").tree)
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
        chainable = Chainable().parse(full_str)
        # this should not be equivalent because it contains an extra function

        expected = """def bar():
  x = "1"
  print(x)

def foo():
  a = 1
"""

        self.assertFalse(chainable.find_function("bar").is_equivalent(expected))

    def test_is_equivalent_with_conditional(self):
        cond_str = """
if True:
  pass
"""

        chainable = Chainable().parse(cond_str)
        self.assertTrue(chainable[0].find_conditions()[0].is_equivalent("True"))

    def test_none_equivalence(self):
        none_str = """
x = None
"""

        chainable = Chainable().parse(none_str)
        self.assertIsNone(chainable.get_variable("x"))
        self.assertFalse(chainable.find_variable("y").is_equivalent("None"))


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

        chainable = Chainable().parse(if_str)
        # it should return an array of Chainables, not a Chainable of an array
        for if_chainable in chainable.find_ifs():
            self.assertIsInstance(if_chainable, Chainable)
        self.assertNotIsInstance(chainable.find_ifs(), Chainable)
        self.assertEqual(len(chainable.find_ifs()), 2)

        self.assertTrue(chainable.find_ifs()[0].is_equivalent("if x == 1:\n  x = 2"))
        self.assertTrue(chainable.find_ifs()[1].is_equivalent("if True:\n  pass"))

    def test_find_conditions(self):
        if_str = """
if True:
  x = 1
else:
  x = 4
"""
        chainable = Chainable().parse(if_str)

        # it should return an array of Chainables, not a Chainable of an array
        for if_cond in chainable.find_ifs()[0].find_conditions():
            self.assertIsInstance(if_cond, Chainable)
        self.assertNotIsInstance(chainable.find_ifs()[0].find_conditions(), Chainable)
        self.assertEqual(len(chainable.find_ifs()[0].find_conditions()), 2)

        self.assertIsNone(chainable.find_ifs()[0].find_conditions()[1].tree)

    def test_find_conditions_only_if(self):
        if_str = """
if True:
  x = 1
"""
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs()[0].find_conditions()), 1)

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
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs()[0].find_conditions()), 4)
        self.assertTrue(
            chainable.find_ifs()[0].find_conditions()[0].is_equivalent("True")
        )
        self.assertTrue(
            chainable.find_ifs()[0].find_conditions()[1].is_equivalent("y == 2")
        )
        self.assertTrue(
            chainable.find_ifs()[0].find_conditions()[2].is_equivalent("not x < 3")
        )
        self.assertEqual(chainable.find_ifs()[0].find_conditions()[3].tree, None)
        self.assertFalse(
            chainable.find_ifs()[0]
            .find_conditions()[3]
            .is_equivalent("This can be anything")
        )

    def test_find_if_bodies(self):
        if_str = """
if True:
  x = 1
"""
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs()[0].find_if_bodies()), 1)
        self.assertTrue(
            chainable.find_ifs()[0].find_if_bodies()[0].is_equivalent("x = 1")
        )

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
        chainable = Chainable().parse(if_str)

        self.assertEqual(len(chainable.find_ifs()[0].find_if_bodies()), 4)
        self.assertTrue(
            chainable.find_ifs()[0].find_if_bodies()[0].is_equivalent("x = 1")
        )
        self.assertTrue(
            chainable.find_ifs()[0].find_if_bodies()[1].is_equivalent("x = 2")
        )
        self.assertTrue(
            chainable.find_ifs()[0].find_if_bodies()[2].is_equivalent("x = 3")
        )
        self.assertTrue(
            chainable.find_ifs()[0].find_if_bodies()[3].is_equivalent("x = 4")
        )
        self.assertRaises(
            IndexError, lambda: chainable.find_ifs()[0].find_if_bodies()[4]
        )


class TestGenericHelpers(unittest.TestCase):
    def test_equality(self):
        self.assertEqual(
            Chainable().parse("def foo():\n  pass"),
            Chainable().parse("def foo():\n  pass"),
        )
        self.assertNotEqual(
            Chainable().parse("def foo():\n  pass"),
            Chainable().parse("def bar():\n  pass"),
        )

    def test_strict_equality(self):
        self.assertNotEqual(
            Chainable().parse("def foo():\n  pass"),
            Chainable().parse("def foo():\n   pass"),
        )

    def test_not_equal_to_non_chainable(self):
        self.assertIsNotNone(Chainable().parse("def foo():\n  pass"))
        self.assertNotEqual(Chainable(), 1)

    def test_find_nth_statement(self):
        func_str = """
if True:
  pass

x = 1
"""
        chainable = Chainable().parse(func_str)

        self.assertTrue(chainable[0].is_equivalent("if True:\n  pass"))
        self.assertTrue(chainable[1].is_equivalent("x = 1"))

    def test_raise_exception_if_out_of_bounds(self):
        one_stmt_str = """
if True:
  pass
"""

        chainable = Chainable().parse(one_stmt_str)
        self.assertRaises(IndexError, lambda: chainable[1])

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
