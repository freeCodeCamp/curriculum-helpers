import unittest
import ast
import py_helpers


class TestStringMethods(unittest.TestCase):
    def test_has_local_variable(self):
        two_locals = """
def foo():
  a = 1
  x = 2
"""
        mod = ast.parse(two_locals)
        self.assertTrue(py_helpers.has_local_variable(mod, "foo", "x"))
        self.assertFalse(py_helpers.has_local_variable(mod, "foo", "y"))
        self.assertFalse(py_helpers.has_local_variable(mod, "bar", "x"))
        self.assertFalse(py_helpers.has_local_variable(mod, "bar", "y"))

    def test_variable_is_integer(self):
        two_vars = """
x = "1"
y = 2
"""
        mod = ast.parse(two_vars)
        self.assertFalse(py_helpers.variable_is_integer(mod, "x"))
        self.assertTrue(py_helpers.variable_is_integer(mod, "y"))

    def test_local_variable_is_integer(self):
        two_locals = """
def foo():
  a = 1
  print(a)
  x = 2
"""
        mod = ast.parse(two_locals)
        self.assertTrue(py_helpers.local_variable_is_integer(mod, "foo", "x"))
        self.assertFalse(py_helpers.local_variable_is_integer(mod, "foo", "y"))

        modWithString = ast.parse('def foo():\n  x = "1"')
        self.assertFalse(
            py_helpers.local_variable_is_integer(modWithString, "foo", "x")
        )

    def test_functions_are_equivalent(self):
        func_str_actual = """def a(
  b,
    c,
):
    print(b)
a = 'variable'"""
        func_str_expected = """another = 'variable'
def a(b, c):
    print(b)"""

        mod_expected = ast.parse(func_str_expected)
        mod_actual = ast.parse(func_str_actual)

        self.assertTrue(
            py_helpers.functions_are_equivalent(mod_expected, mod_actual, "a")
        )

    def test_functions_are_not_equivalent(self):
        func_str_actual = """def a(
  b,
    d,
):
    print(b)
a = 'variable'"""
        # different arg name
        func_str_expected = """another = 'variable'
def a(b, c):
    print(b)"""

        mod_expected = ast.parse(func_str_expected)
        mod_actual = ast.parse(func_str_actual)

        self.assertFalse(
            py_helpers.functions_are_equivalent(mod_expected, mod_actual, "a")
        )


if __name__ == "__main__":
    unittest.main()
