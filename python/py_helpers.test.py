import unittest
import ast
from py_helpers import ASTExplorer


class TestConstructor(unittest.TestCase):
    def test_constructor(self):
        explorer = ASTExplorer()

        self.assertIsNone(explorer.tree)

    def test_constructor_with_tree(self):
        tree = ast.parse("def foo():\n  pass")
        explorer = ASTExplorer(tree)

        self.assertEqual(explorer.tree, tree)

    def test_constructor_with_string(self):
        with_string = ASTExplorer("def foo():\n  pass")
        with_tree = ASTExplorer(ast.parse("def foo():\n  pass"))

        self.assertEqual(with_string, with_tree)

    def test_constructor_with_anything_else(self):
        self.assertRaises(TypeError, lambda: ASTExplorer(1))


class TestVariableHelpers(unittest.TestCase):
    def test_find_variable_can_handle_all_asts(self):
        explorer = ASTExplorer("x = 1")

        # First find_variable, so know that the AST has no body and we can be
        # sure find_class handles this.
        self.assertEqual(explorer.find_variable("x").find_variable("x"), ASTExplorer())

    def test_has_local_variable_in_function(self):
        func_str = """def foo():
  a = 1
  print(a)
  x = 2
"""

        explorer = ASTExplorer(func_str)

        self.assertTrue(explorer.find_function("foo").has_variable("x"))

    def test_has_global_variable(self):
        globals_str = """a = 1
x = 2
"""

        explorer = ASTExplorer(globals_str)

        self.assertTrue(explorer.has_variable("x"))

    def test_does_not_see_local_variables_out_of_scope(self):
        scopes_str = """def foo():
  a = 1
b = 2
"""

        explorer = ASTExplorer(scopes_str)
        self.assertFalse(explorer.has_variable("a"))

    def test_is_integer(self):
        two_locals = """
def foo():
  a = 1
  print(a)
  x = 2
y = 3
"""
        explorer = ASTExplorer(two_locals)
        self.assertTrue(explorer.find_function("foo").find_variable("x").is_integer())
        self.assertFalse(explorer.find_function("foo").find_variable("y").is_integer())

    def test_none_assignment(self):
        none_str = """
x = None
"""
        explorer = ASTExplorer(none_str)

        self.assertTrue(explorer.has_variable("x"))
        self.assertTrue(explorer.find_variable("x").is_equivalent("x = None"))

    def test_local_variable_is_integer_with_string(self):
        explorer = ASTExplorer('def foo():\n  x = "1"')

        self.assertFalse(explorer.find_function("foo").find_variable("x").is_integer())

    def test_variable_has_constant_value(self):
        explorer = ASTExplorer('def foo():\n  x = "1"')

        self.assertEqual(explorer.find_function("foo").get_variable("x"), "1")

    def test_find_variable(self):
        explorer = ASTExplorer('def foo():\n  x = "1"')

        self.assertTrue(
            explorer.find_function("foo").find_variable("x").is_equivalent('x = "1"'),
        )

    def test_find_variable_not_found(self):
        explorer = ASTExplorer('def foo():\n  x = "1"')

        self.assertEqual(explorer.find_variable("y"), ASTExplorer())

    def test_function_call_assigned_to_variable(self):
        explorer = ASTExplorer("def foo():\n  x = bar()")

        self.assertTrue(
            explorer.find_function("foo").find_variable("x").value_is_call("bar")
        )

    def test_function_call_not_assigned_to_variable(self):
        explorer = ASTExplorer("def foo():\n  bar()")

        self.assertFalse(explorer.find_function("foo").value_is_call("bar"))


class TestFunctionAndClassHelpers(unittest.TestCase):
    def test_find_function_returns_explorer(self):
        func_str = """def foo():
  pass
"""
        explorer = ASTExplorer(func_str)

        self.assertIsInstance(explorer.find_function("foo"), ASTExplorer)
        self.assertIsInstance(explorer.find_function("bar"), ASTExplorer)

    def test_find_function_can_handle_all_asts(self):
        explorer = ASTExplorer("x = 1")

        # First find_variable, so know that the AST has no body and we can be
        # sure find_function handles this.
        self.assertEqual(
            explorer.find_variable("x").find_function("foo"), ASTExplorer()
        )

    def test_parse_creates_explorer(self):
        explorer = ASTExplorer("def foo():\n  pass")

        self.assertIsInstance(explorer.tree, ast.Module)
        self.assertEqual(
            ast.dump(explorer.tree), ast.dump(ast.parse("def foo():\n  pass"))
        )

    def test_find_function_returns_function_ast(self):
        explorer = ASTExplorer("def foo():\n  pass")

        func = explorer.find_function("foo")

        self.assertIsInstance(func.tree, ast.FunctionDef)
        self.assertEqual(func.tree.name, "foo")

    def test_find_function_returns_explorer_none(self):
        explorer = ASTExplorer("def foo():\n  pass")

        func = explorer.find_function("bar")

        self.assertIsInstance(func, ASTExplorer)
        self.assertEqual(func.tree, None)

    def test_nested_function(self):
        nested_str = """def foo():
  def bar():
    x = 1
  y = 2
"""

        explorer = ASTExplorer(nested_str)

        self.assertTrue(explorer.find_function("foo").has_variable("y"))
        self.assertFalse(explorer.find_function("foo").has_variable("x"))
        self.assertTrue(
            explorer.find_function("foo").find_function("bar").has_variable("x")
        )

    def test_find_class(self):
        class_str = """
class Foo:
  def __init__(self):
    pass
"""

        explorer = ASTExplorer(class_str)

        self.assertIsNotNone(explorer.find_class("Foo"))
        self.assertIsInstance(explorer.find_class("Foo"), ASTExplorer)

        self.assertIsInstance(explorer.find_class("Bar"), ASTExplorer)
        self.assertEqual(explorer.find_class("Bar"), ASTExplorer())

    def test_find_class_can_handle_all_asts(self):
        explorer = ASTExplorer("x = 1")

        # First find_variable, so know that the AST has no body and we can be
        # sure find_class handles this.
        self.assertEqual(explorer.find_variable("x").find_class("Foo"), ASTExplorer())

    def test_method_exists(self):
        class_str = """
class Foo:
  def __init__(self):
    self.x = 1
  def bar(self):
    pass
"""
        explorer = ASTExplorer(class_str)

        self.assertTrue(explorer.find_class("Foo").has_function("bar"))

    def test_dunder_method_exists(self):
        class_str = """
class Foo:
  def __init__(self):
    self.x = 1
  def bar(self):
    pass
"""
        explorer = ASTExplorer(class_str)

        self.assertTrue(explorer.find_class("Foo").has_function("__init__"))

    def test_not_has_function(self):
        explorer = ASTExplorer("def foo():\n  pass")

        self.assertFalse(explorer.has_function("bar"))


class TestEquivalenceHelpers(unittest.TestCase):
    def test_is_equivalent(self):
        full_str = """def foo():
  a = 1
  print(a)
def bar():
  x = "1"
  print(x)
"""

        explorer = ASTExplorer(full_str)

        expected = """def bar():
  x = "1"
  print(x)
"""

        self.assertTrue(explorer.find_function("bar").is_equivalent(expected))
        # Obviously, it should be equivalent to itself
        self.assertTrue(
            explorer.find_function("bar").is_equivalent(
                ast.unparse(explorer.find_function("bar").tree)
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
        explorer = ASTExplorer(full_str)
        # this should not be equivalent because it contains an extra function

        expected = """def bar():
  x = "1"
  print(x)

def foo():
  a = 1
"""

        self.assertFalse(explorer.find_function("bar").is_equivalent(expected))

    def test_is_equivalent_with_conditional(self):
        cond_str = """
if True:
  pass
"""

        explorer = ASTExplorer(cond_str)
        self.assertTrue(explorer[0].find_conditions()[0].is_equivalent("True"))

    def test_none_equivalence(self):
        none_str = """
x = None
"""

        explorer = ASTExplorer(none_str)
        self.assertIsNone(explorer.get_variable("x"))
        self.assertFalse(explorer.find_variable("y").is_equivalent("None"))

    def test_whitespace_equivalence(self):
        str_with_whitespace = """

x = 1
"""
        str_with_different_whitespace = """x   =   1"""
        self.assertTrue(
            ASTExplorer(str_with_whitespace).is_equivalent(
                str_with_different_whitespace
            )
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

        explorer = ASTExplorer(if_str)
        # it should return an array of explorers, not a explorer of an array
        for if_explorer in explorer.find_ifs():
            self.assertIsInstance(if_explorer, ASTExplorer)
        self.assertNotIsInstance(explorer.find_ifs(), ASTExplorer)
        self.assertEqual(len(explorer.find_ifs()), 2)

        self.assertTrue(explorer.find_ifs()[0].is_equivalent("if x == 1:\n  x = 2"))
        self.assertTrue(explorer.find_ifs()[1].is_equivalent("if True:\n  pass"))

    def test_find_conditions(self):
        if_str = """
if True:
  x = 1
else:
  x = 4
"""
        explorer = ASTExplorer(if_str)

        # it should return an array of explorers, not a explorer of an array
        for if_cond in explorer.find_ifs()[0].find_conditions():
            self.assertIsInstance(if_cond, ASTExplorer)
        self.assertNotIsInstance(explorer.find_ifs()[0].find_conditions(), ASTExplorer)
        self.assertEqual(len(explorer.find_ifs()[0].find_conditions()), 2)

        self.assertIsNone(explorer.find_ifs()[0].find_conditions()[1].tree)

    def test_find_conditions_without_if(self):
        explorer = ASTExplorer("x = 1")

        self.assertEqual(explorer.find_conditions(), [])

    def test_find_conditions_only_if(self):
        if_str = """
if True:
  x = 1
"""
        explorer = ASTExplorer(if_str)

        self.assertEqual(len(explorer.find_ifs()[0].find_conditions()), 1)

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
        explorer = ASTExplorer(if_str)

        self.assertEqual(len(explorer.find_ifs()[0].find_conditions()), 4)
        self.assertTrue(
            explorer.find_ifs()[0].find_conditions()[0].is_equivalent("True")
        )
        self.assertTrue(
            explorer.find_ifs()[0].find_conditions()[1].is_equivalent("y == 2")
        )
        self.assertTrue(
            explorer.find_ifs()[0].find_conditions()[2].is_equivalent("not x < 3")
        )
        self.assertEqual(explorer.find_ifs()[0].find_conditions()[3].tree, None)
        self.assertRaises(
            IndexError,
            lambda: explorer.find_ifs()[0].find_conditions()[4],
        )

    def test_find_if_bodies(self):
        if_str = """
if True:
  x = 1
"""
        explorer = ASTExplorer(if_str)

        self.assertEqual(len(explorer.find_ifs()[0].find_if_bodies()), 1)
        self.assertTrue(
            explorer.find_ifs()[0].find_if_bodies()[0].is_equivalent("x = 1")
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
        explorer = ASTExplorer(if_str)

        self.assertEqual(len(explorer.find_ifs()[0].find_if_bodies()), 4)
        self.assertTrue(
            explorer.find_ifs()[0].find_if_bodies()[0].is_equivalent("x = 1")
        )
        self.assertTrue(
            explorer.find_ifs()[0].find_if_bodies()[1].is_equivalent("x = 2")
        )
        self.assertTrue(
            explorer.find_ifs()[0].find_if_bodies()[2].is_equivalent("x = 3")
        )
        self.assertTrue(
            explorer.find_ifs()[0].find_if_bodies()[3].is_equivalent("x = 4")
        )
        self.assertRaises(
            IndexError, lambda: explorer.find_ifs()[0].find_if_bodies()[4]
        )

    def test_find_if_bodies_without_if(self):
        explorer = ASTExplorer("x = 1")

        self.assertEqual(len(explorer.find_if_bodies()), 0)


class TestGenericHelpers(unittest.TestCase):
    def test_equality(self):
        self.assertEqual(
            ASTExplorer("def foo():\n  pass"),
            ASTExplorer("def foo():\n  pass"),
        )
        self.assertNotEqual(
            ASTExplorer("def foo():\n  pass"),
            ASTExplorer("def bar():\n  pass"),
        )

    def test_strict_equality(self):
        self.assertNotEqual(
            ASTExplorer("def foo():\n  pass"),
            ASTExplorer("def foo():\n   pass"),
        )

    def test_not_equal_to_non_explorer(self):
        self.assertIsNotNone(ASTExplorer("def foo():\n  pass"))
        self.assertNotEqual(ASTExplorer(), 1)

    def test_find_nth_statement(self):
        func_str = """
if True:
  pass

x = 1
"""
        explorer = ASTExplorer(func_str)

        self.assertTrue(explorer[0].is_equivalent("if True:\n  pass"))
        self.assertTrue(explorer[1].is_equivalent("x = 1"))

    def test_raise_exception_if_out_of_bounds(self):
        one_stmt_str = """
if True:
  pass
"""

        explorer = ASTExplorer(one_stmt_str)
        self.assertRaises(IndexError, lambda: explorer[1])

    def test_len_of_body(self):
        func_str = """
if True:
  pass
"""

        explorer = ASTExplorer(func_str)

        self.assertEqual(len(explorer), 1)

    def test_len(self):
        ifs_str = """
if True:
  pass

if True:
  pass
"""

        explorer = ASTExplorer(ifs_str)

        self.assertEqual(len(explorer.find_ifs()), 2)


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestConstructor))
    suite.addTest(unittest.makeSuite(TestVariableHelpers))
    suite.addTest(unittest.makeSuite(TestFunctionAndClassHelpers))
    suite.addTest(unittest.makeSuite(TestEquivalenceHelpers))
    suite.addTest(unittest.makeSuite(TestConditionalHelpers))
    suite.addTest(unittest.makeSuite(TestGenericHelpers))
    return suite


if __name__ == "__main__":
    runner = unittest.TextTestRunner()
    runner.run(suite())
