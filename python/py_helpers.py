import ast

# A chainable class that allows us to call functions on the result of parsing a string


class Node:
    def __init__(self, tree=None):
        if isinstance(tree, str):
            self.tree = ast.parse(tree)
        elif isinstance(tree, ast.AST) or tree == None:
            self.tree = tree
        else:
            raise TypeError("Node must be initialized with a string or AST")

    def __getitem__(self, i):
        if getattr(self.tree, "__getitem__", False):
            return Node(self.tree[i])
        elif getattr(self.tree, "body", False):
            return Node(self.tree.body[i])
        else:
            raise IndexError("Empty Nodes cannot be indexed.")

    def __len__(self):
        if getattr(self.tree, "__len__", False):
            return len(self.tree)
        if self.tree is None:
            return 0
        if not hasattr(self.tree, "body"):
            return 1
        return len(self.tree.body)

    def __eq__(self, other):
        if not isinstance(other, Node):
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
            return "Node:\nNone"
        return "Node:\n" + ast.dump(self.tree, indent=2)

    def __str__(self):
        if self.tree == None:
            return "# no ast"
        return ast.unparse(self.tree)

    def _has_body(self):
        return bool(getattr(self.tree, "body", False))

    # "find" functions return a new node with the result of the find
    # function. In this case, it returns a new node with the function
    # definition (if it exists)

    def find_function(self, func):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.FunctionDef):
                if node.name == func:
                    return Node(node)
        return Node()

    def find_functions(self, func):
        return [
            node
            for node in self._find_all((ast.FunctionDef, ast.AsyncFunctionDef))
            if node.tree.name == func
        ]

    def find_async_function(self, func):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.AsyncFunctionDef):
                if node.name == func:
                    return Node(node)
        return Node()

    def find_awaits(self):
        return [
            node
            for node in self._find_all(ast.Expr)
            if isinstance(node.tree.value, ast.Await)
        ]

    def has_args(self, arg_str):
        if not isinstance(self.tree, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return False
        dec_list = (f"@{Node(node)}" for node in self.tree.decorator_list)
        dec_str = "\n".join(dec_list) + "\n" if dec_list else ""
        if id := getattr(self.tree.returns, "id", False):
            returns = f" -> {id}"
        elif val := getattr(self.tree.returns, "value", False):
            returns = f" -> '{val}'"
        else:
            returns = ""
        async_kw = ""
        if isinstance(self.tree, ast.AsyncFunctionDef):
            async_kw = "async "
        body_lines = str(self.find_body()).split("\n")
        new_body = "".join([f"\n  {line}" for line in body_lines])
        func_str = (
            f"{dec_str}{async_kw}def {self.tree.name}({arg_str}){returns}:{new_body}"
        )
        return self.is_equivalent(func_str)

    # returns_str is the annotation of the type returned by the function
    def has_returns(self, returns_str):
        if not isinstance(self.tree, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return False
        if isinstance(self.tree.returns, ast.Name):
            return returns_str == self.tree.returns.id
        elif isinstance(self.tree.returns, ast.Constant):
            return returns_str == self.tree.returns.value
        return False

    def find_body(self):
        if not isinstance(self.tree, ast.AST):
            return Node()
        if not hasattr(self.tree, "body"):
            return Node()
        return Node(ast.Module(self.tree.body, []))

    # find the return statement of a function
    def find_return(self):
        if return_list := self._find_all(ast.Return):
            return return_list[0]
        return Node()

    def has_return(self, return_value):
        return self.find_return().is_equivalent(f"return {return_value}")

    def find_imports(self):
        return self._find_all((ast.Import, ast.ImportFrom))

    def find_comps(self):
        return [
            node
            for node in self._find_all(ast.Expr)
            if isinstance(
                node.tree.value,
                (ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp),
            )
        ]

    def _find_comp(
        self, classes=(ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp)
    ):
        if isinstance(self.tree, classes):
            return Node(self.tree)
        elif isinstance(self.tree, (ast.Assign, ast.AnnAssign, ast.Return)):
            if isinstance(self.tree.value, classes):
                return Node(self.tree.value)
            return Node()

    # find a list of iterables of a comprehension/generator expression
    def find_comp_iters(self):
        if not (node := self._find_comp()):
            return []
        return [Node(gen.iter) for gen in node.tree.generators]

    # find a list of targets (iteration variables) of a comprehension/generator expression
    def find_comp_targets(self):
        if not (node := self._find_comp()):
            return []
        return [Node(gen.target) for gen in node.tree.generators]

    # find the key of a dictionary comprehension
    def find_comp_key(self):
        if not (node := self._find_comp(ast.DictComp)):
            return Node()
        return Node(node.tree.key)

    # find the expression evaluated for a comprehension/generator expression
    # which is the value of the key in case of a dictionary comprehension
    def find_comp_expr(self):
        if not (node := self._find_comp()):
            return Node()
        if isinstance(node.tree, (ast.ListComp, ast.SetComp, ast.GeneratorExp)):
            return Node(node.tree.elt)
        elif isinstance(node.tree, ast.DictComp):
            return Node(node.tree.value)

    # find a list of `IfExpr`s at the end of the comprehension/generator expression
    def find_comp_ifs(self):
        if not (node := self._find_comp()):
            return []
        return [
            Node(gen.ifs[i])
            for gen in node.tree.generators
            for i in range(len(gen.ifs))
        ]

    # "has" functions return a boolean indicating whether whatever is being
    # searched for exists. In this case, it returns True if the variable exists.

    def has_variable(self, name):
        return self.find_variable(name) != Node()

    def has_import(self, import_str):
        return any(
            import_node.is_equivalent(import_str) for import_node in self.find_imports()
        )

    # find a list of function calls of the 'name' function
    def find_calls(self, name):
        call_list = []
        for node in self._find_all(ast.Expr):
            if func := getattr(node.tree.value, "func", False):
                if isinstance(func, ast.Name) and func.id == name:
                    call_list.append(Node(node.tree.value))
                elif isinstance(func, ast.Attribute) and func.attr == name:
                    call_list.append(Node(node.tree.value))
        return call_list

    def has_call(self, call):
        return any(node.is_equivalent(call) for node in self._find_all(ast.Expr))

    def find_call_args(self):
        if not isinstance(self.tree, ast.Call):
            return []
        return [Node(arg) for arg in self.tree.args]

    def has_stmt(self, node_str):
        if not self._has_body():
            return False
        return any(Node(node).is_equivalent(node_str) for node in self.tree.body)

    def find_variable(self, name):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
                            return Node(node)
                    if isinstance(target, ast.Attribute):
                        names = name.split(".")
                        if target.value.id == names[0] and target.attr == names[1]:
                            return Node(node)
            elif isinstance(node, ast.AnnAssign):
                if isinstance(node.target, ast.Name):
                    if node.target.id == name:
                        return Node(node)
        return Node()

    # find variable incremented or decremented using += or -=
    def find_aug_variable(self, name):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.AugAssign):
                if isinstance(node.target, ast.Name):
                    if node.target.id == name:
                        return Node(node)
        return Node()

    def get_variable(self, name):
        var = self.find_variable(name)
        if var != Node():
            return var.tree.value.value
        else:
            return None

    def has_function(self, name):
        return self.find_function(name) != Node()

    def has_class(self, name):
        return self.find_class(name) != Node()

    def has_decorators(self, *args):
        # the order of args does matter
        if not isinstance(self.tree, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return False
        dec_list = (Node(node) for node in self.tree.decorator_list)
        return all(any(dec.is_equivalent(arg) for dec in dec_list) for arg in args)

    # Checks if the current scope contains a "pass" statement

    def has_pass(self):
        if isinstance(self.tree, (ast.If, ast.While, ast.For)):
            return False
        if getattr(self.tree, "body", False):
            return any(isinstance(node, ast.Pass) for node in self.tree.body)
        return False

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

    # Loosely compares the code in target_str with the code represented by the
    # Node's AST. If the two codes are semantically equivalent (i.e. the same if
    # you ignore formatting and context) then this returns True, otherwise
    # False.
    #
    # Ignoring context means that the following comparison is True despite the
    # fact that the AST of `cond_node` is `Constant(value=True)` and `True`
    # compiles to `Module(body=[Expr(value=Constant(value=True))],
    # type_ignores=[])`:
    #
    # node = Node("if True:\n  pass") cond_node =
    # node.find_ifs()[0].find_conditions()[0] cond_node.is_equivalent("True")

    def is_equivalent(self, target_str):
        # Setting the tree to None is used to represent missing elements. Such
        # as the condition of a final else clause. It is, therefore, not
        # equivalent to any string.
        if self.tree == None:
            return False
        code_str = ast.unparse(self.tree)

        # Why parse and unparse again? Because of an edge case when comparing
        # the `target_str` "'True'" with the test in "if 'True':". These should
        # be equivalent, but the condition unparses to "'True'", while the
        # `target_str` becomes '"""True"""' when parsed and unparsed again.

        # By parsing and unparsing `code_str` we get '"""True"""' and the
        # comparison returns True as expected.
        return ast.unparse(ast.parse(code_str)) == ast.unparse(ast.parse(target_str))

    def is_empty(self):
        return self.tree == None

    # Finds the class definition with the given name

    def find_class(self, class_name):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name == class_name:
                    return Node(node)
        return Node()

    def inherits_from(self, *args):
        if not isinstance(self.tree, ast.ClassDef):
            return False
        if not self.tree.bases:
            return False
        id_list = [node.id for node in self.tree.bases]
        return all(arg in id_list for arg in args)

    # Find an array of conditions in an if statement

    def find_ifs(self):
        return self._find_all(ast.If)

    def _find_all(self, ast_type):
        return [Node(node) for node in self.tree.body if isinstance(node, ast_type)]

    def find_whiles(self):
        return self._find_all(ast.While)

    def find_for_loops(self):
        return self._find_all(ast.For)

    def find_for_vars(self):
        if not isinstance(self.tree, ast.For):
            return Node()
        return Node(self.tree.target)

    def find_for_iter(self):
        if not isinstance(self.tree, ast.For):
            return Node()
        return Node(self.tree.iter)

    def find_if(self, if_str):
        if_list = self._find_all(ast.If)
        for if_statement in if_list:
            if if_statement.find_conditions()[0].is_equivalent(if_str):
                return if_statement
        return Node()

    def find_while(self, while_str):
        while_list = self._find_all(ast.While)
        for while_loop in while_list:
            if while_loop.find_conditions()[0].is_equivalent(while_str):
                return while_loop
        return Node()

    def find_for(self, target_str, iter_str):
        for_list = self._find_all(ast.For)
        for for_loop in for_list:
            if for_loop.find_for_vars().is_equivalent(
                target_str
            ) and for_loop.find_for_iter().is_equivalent(iter_str):
                return for_loop
        return Node()

    # Find an array of bodies in if/elif statement and while or for loops

    def find_bodies(self):
        def _find_bodies(tree):
            if not isinstance(tree, (ast.If, ast.While, ast.For)):
                return []
            if tree.orelse == []:
                return [tree.body]
            if isinstance(tree.orelse[0], (ast.If, ast.While, ast.For)):
                return [tree.body] + _find_bodies(tree.orelse[0])

            return [tree.body] + [tree.orelse]

        return [Node(ast.Module(body, [])) for body in _find_bodies(self.tree)]

    # Find an array of conditions in if/elif statement or while loop

    def find_conditions(self):
        def _find_conditions(tree):
            if not isinstance(tree, (ast.If, ast.While)):
                return []
            test = tree.test
            if tree.orelse == []:
                return [test]
            if isinstance(tree.orelse[0], (ast.If, ast.While)):
                return [test] + _find_conditions(tree.orelse[0])

            return [test, None]

        return [Node(test) for test in _find_conditions(self.tree)]

    # Returs a Boolean indicating if the statements passed as arguments
    # are found in the same order in the tree (statements can be non-consecutive)
    def is_ordered(self, *args):
        if not self._has_body():
            return False
        if len(args) < 2:
            return False
        arg_dict = {key: None for key in range(len(args))}
        for i, node in enumerate(self.tree.body):
            for j, arg in enumerate(args):
                if Node(node).is_equivalent(arg):
                    arg_dict[j] = i
                    break
        if None in arg_dict.values():
            return False
        return all(arg_dict[n] < arg_dict[n + 1] for n in range(len(arg_dict) - 1))


# Exception formatting functions. Currently bundled with the Node class, until
# we improve the testing, building and CI so that they can easily handle
# multiple files.


def drop_until(*, traces, filename):
    from itertools import dropwhile

    return list(
        dropwhile(lambda line: not line.startswith(f'  File "{filename}"'), traces)
    )


def build_message(*, traces, exception_list):
    return "".join(["Traceback (most recent call last):\n"] + traces + exception_list)


def _replace_startswith(string, old, new):
    if string.startswith(old):
        return new + string[len(old) :]
    return string


def format_exception(*, exception, traceback, filename, new_filename=None):
    if new_filename is None:
        new_filename = filename
    from traceback import format_exception_only, format_tb

    # The trace up to "filename" are the frames that are not part of the user's
    # code so we drop them.
    traces = drop_until(traces=format_tb(traceback), filename=filename)
    renamed_traces = [
        _replace_startswith(trace, f'  File "{filename}"', f'  File "{new_filename}"')
        for trace in traces
    ]
    renamed_exception = [
        _replace_startswith(e, f'  File "{filename}"', f'  File "{new_filename}"')
        for e in format_exception_only(exception)
    ]
    return build_message(traces=renamed_traces, exception_list=renamed_exception)
