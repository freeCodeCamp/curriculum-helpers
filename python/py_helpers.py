import ast

# A chainable class that allows us to call functions on the result of parsing a string


class Chainable:
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

    def parse(self, string):
        return Chainable(ast.parse(string))

    # "find" functions return a new chainable with the result of the find
    # function. In this case, it returns a new chainable with the function
    # definition (if it exists)

    def find_function(self, func):
        for node in self.tree.body:
            if isinstance(node, ast.FunctionDef):
                if node.name == func:
                    return Chainable(node)
        return None

    # "has" functions return a boolean indicating whether whatever is being
    # searched for exists. In this case, it returns True if the variable exists.

    def has_variable(self, name):
        return self.find_variable(name) != None

    def find_variable(self, name):
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
                            return Chainable(node)
        return None

    def get_variable(self, name):
        var = self.find_variable(name)
        if var != None:
            return var.tree.value.value
        else:
            return None

    def has_function(self, name):
        return self.find_function(name) != None

    # Checks the variable, name, is in the current scope and is an integer

    def variable_is_integer(self, name):
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
                            return type(node.value.value) == type(1)

        return False

    def value_is_call(self, name):
        if not isinstance(self.tree, ast.Assign):
            return False
        call = self.tree.value
        if isinstance(call, ast.Call):
            return call.func.id == name
        return False

    # Takes an string and checks if is equivalent (up to being wrapped in a module) to the chainable's AST

    def is_equivalent(self, target_str):
        target_ast = ast.parse(target_str)
        have_same_dump = ast.dump(self.tree) == ast.dump(target_ast)
        if have_same_dump:
            return True
        elif not isinstance(self.tree, ast.Module):
            return self._wrap_in_module().is_equivalent(target_str)
        else:
            return False

    # Finds the class definition with the given name

    def find_class(self, class_name):
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name == class_name:
                    return Chainable(node)
        return None

    # Find an array of conditions in an if statement

    def find_ifs(self):
        return self._find_all(ast.If)

    # Find the nth statement

    def find_nth(self, n):
        return Chainable(self.tree.body[n])

    def _find_all(self, ast_type):
        return Chainable(
            ast.Module(
                [node for node in self.tree.body if isinstance(node, ast_type)], []
            )
        )

    def _wrap_in_module(self):
        return Chainable(ast.Module([self.tree], []))

    def find_conditions(self):
        def _find_conditions(tree):
            test = tree.test
            if self.tree.orelse == []:
                return [test]
            elif isinstance(tree.orelse[0], ast.If):
                return [test] + _find_conditions(tree.orelse[0])
            else:
                return [test, None]

        return Chainable(_find_conditions(self.tree))
