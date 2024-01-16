import ast

# A chainable class that allows us to call functions on the result of parsing a string


class Chainable:
    # TODO: allow initialization with a string
    def __init__(self, tree=None):
        self.tree = tree

    def __getitem__(self, i):
        if getattr(self.tree, "__getitem__", False):
            return Chainable(self.tree[i])
        else:
            return Chainable(self.tree.body[i])

    def __len__(self):
        if getattr(self.tree, "__len__", False):
            return len(self.tree)
        else:
            return len(self.tree.body)

    def __eq__(self, other):
        if not isinstance(other, Chainable):
            return False
        if self.tree == None:
            return other.tree == None
        if other.tree == None:
            return False
        return ast.dump(self.tree, include_attributes=True) == ast.dump(
            other.tree, include_attributes=True
        )

    def __repr__(self):
        if self.tree == None:
            return "Chainable(None)"
        return "Chainable:\n" + ast.dump(self.tree, indent=2)

    def parse(self, string):
        return Chainable(ast.parse(string))

    def _has_body(self):
        return bool(getattr(self.tree, "body", False))

    # "find" functions return a new chainable with the result of the find
    # function. In this case, it returns a new chainable with the function
    # definition (if it exists)

    def find_function(self, func):
        if not self._has_body():
            return Chainable()
        for node in self.tree.body:
            if isinstance(node, ast.FunctionDef):
                if node.name == func:
                    return Chainable(node)
        return Chainable()

    # "has" functions return a boolean indicating whether whatever is being
    # searched for exists. In this case, it returns True if the variable exists.

    def has_variable(self, name):
        return self.find_variable(name).tree != None

    def find_variable(self, name):
        if not self._has_body():
            return Chainable()
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
                            return Chainable(node)
        return Chainable()

    def get_variable(self, name):
        var = self.find_variable(name)
        if var != Chainable():
            return var.tree.value.value
        else:
            return None

    def has_function(self, name):
        return self.find_function(name) != None

    # Checks the variable, name, is in the current scope and is an integer

    def is_integer(self):
        if not isinstance(self.tree, ast.Assign):
            return False
        return type(self.tree.value.value) == type(1)

    def value_is_call(self, name):
        if not isinstance(self.tree, ast.Assign):
            return False
        call = self.tree.value
        if isinstance(call, ast.Call):
            return call.func.id == name
        return False

    # Takes an string and checks if is equivalent to the chainable's AST. This
    # is a loose comparison that tries to find out if the code is essentially
    # the same. For example, the string "True" is not represented by the same
    # AST as the test in "if True:" (the string could be wrapped in Module,
    # Interactive or Expression, depending on the parse mode and the test is
    # just a Constant), but they are equivalent.

    def is_equivalent(self, target_str):
        # Setting the tree to None is used to represent missing elements. Such
        # as the condition of a final else clause. It is, therefore, not
        # equivalent to any string.
        if self.tree == None:
            return False
        return ast.unparse(self.tree) == ast.unparse(ast.parse(target_str))

    # Finds the class definition with the given name

    def find_class(self, class_name):
        if not self._has_body():
            return Chainable()
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name == class_name:
                    return Chainable(node)
        return Chainable()

    # Find an array of conditions in an if statement

    def find_ifs(self):
        return self._find_all(ast.If)

    def _find_all(self, ast_type):
        return [
            Chainable(node) for node in self.tree.body if isinstance(node, ast_type)
        ]

    def find_conditions(self):
        def _find_conditions(tree):
            if not isinstance(tree, ast.If):
                return []
            test = tree.test
            if self.tree.orelse == []:
                return [test]
            elif isinstance(tree.orelse[0], ast.If):
                return [test] + _find_conditions(tree.orelse[0])
            else:
                return [test, None]

        return [Chainable(test) for test in _find_conditions(self.tree)]

    # Find an array of bodies in an elif statement

    def find_if_bodies(self):
        def _find_if_bodies(tree):
            if self.tree.orelse == []:
                return [tree.body]
            elif isinstance(tree.orelse[0], ast.If):
                return [tree.body] + _find_if_bodies(tree.orelse[0])
            else:
                return [tree.body] + [tree.orelse]

        return [Chainable(body) for body in _find_if_bodies(self.tree)]
