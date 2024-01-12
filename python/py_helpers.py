import ast

# A chainable class that allows us to call functions on the result of parsing a string


class Chainable:
    def __init__(self, tree=None):
        self.tree = tree

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
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
                            return True
        return False

    def has_function(self, name):
        return self.find_function(name) != None

    # This function checks the variable, name, is in the current scope and is an integer

    def variable_is_integer(self, name):
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
                            return type(node.value.value) == type(1)

        return False

    # This function takes an AST and checks if is equivalent (up to being wrapped in a module) to the chainable's AST

    def is_equivalent(self, target_ast):
        have_same_dump = ast.dump(self.tree) == ast.dump(target_ast)
        if have_same_dump:
            return True
        else:
            if isinstance(target_ast, ast.Module):
                return len(target_ast.body) == 1 and self.is_equivalent(
                    target_ast.body[0]
                )
            return False

    # This function finds the class definition with the given name

    def find_class(self, class_name):
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name == class_name:
                    return Chainable(node)
        return None
