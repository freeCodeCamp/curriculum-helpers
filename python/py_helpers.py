import ast


def _get_function(mod, func):
    for node in mod.body:
        if isinstance(node, ast.FunctionDef):
            if node.name == func:
                return node
    return None


def _local_variable_in_function(func, name):
    for node in func.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == name:
                        return True
    return False


# This function takes an AST and checks if the function, func, has a local variable with the given name


def has_local_variable(mod, func_name, name):
    func = _get_function(mod, func_name)
    if func is None:
        return False

    return _local_variable_in_function(func, name)


# This function takes an AST and checks if the variable has the given type


def variable_is_integer(mod, name):
    for node in mod.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == name:
                        return type(node.value.value) == type(1)

    return False


# This function takes an AST and checks if the local variable has the given type


def local_variable_is_integer(mod, func_name, name):
    func = _get_function(mod, func_name)
    if func is None:
        return False
    return variable_is_integer(func, name)


# This function takes two ASTs and checks if the named function is equivalent


def functions_are_equivalent(mod_expected, mod_actual, func):
    func_expected = _get_function(mod_expected, func)
    func_actual = _get_function(mod_actual, func)

    if func_expected is None or func_actual is None:
        return False

    return ast.dump(func_expected) == ast.dump(func_actual)
