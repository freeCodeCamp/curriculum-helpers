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
        else:
            return Node(self.tree.body[i])

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

    def find_body(self):
        if not isinstance(self.tree, ast.AST):
            return Node()
        if not hasattr(self.tree, "body"):
            return Node()
        return Node(ast.Module(self.tree.body, []))

    # "has" functions return a boolean indicating whether whatever is being
    # searched for exists. In this case, it returns True if the variable exists.

    def has_variable(self, name):
        return self.find_variable(name) != Node()

    def find_variable(self, name):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == name:
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

    # Checks if the current scope contains a "pass" statement
    
    def has_pass(self):
        if isinstance(self.tree, (ast.If, ast.While, ast.For)):
            return False
        if getattr(self.tree, 'body', False):
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

    # Finds the class definition with the given name

    def find_class(self, class_name):
        if not self._has_body():
            return Node()
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name == class_name:
                    return Node(node)
        return Node()

    # Find an array of conditions in an if statement

    def find_ifs(self):
        return self._find_all(ast.If)

    def _find_all(self, ast_type):
        return [Node(node) for node in self.tree.body if isinstance(node, ast_type)]

    def find_conditions(self):
        def _find_conditions(tree):
            if not isinstance(tree, ast.If):
                return []
            test = tree.test
            if self.tree.orelse == []:
                return [test]
            if isinstance(tree.orelse[0], ast.If):
                return [test] + _find_conditions(tree.orelse[0])

            return [test, None]

        return [Node(test) for test in _find_conditions(self.tree)]

    # Find an array of bodies in an elif statement

    def find_if_bodies(self):
        def _find_if_bodies(tree):
            if not isinstance(tree, ast.If):
                return []
            if self.tree.orelse == []:
                return [tree.body]
            if isinstance(tree.orelse[0], ast.If):
                return [tree.body] + _find_if_bodies(tree.orelse[0])

            return [tree.body] + [tree.orelse]

        return [Node(ast.Module(body, [])) for body in _find_if_bodies(self.tree)]

    def find_whiles(self):
        return self._find_all(ast.While)

    def find_while_conditions(self):
        def _find_while_conditions(tree):
            if not isinstance(tree, ast.While):
                return []
            test = tree.test
            if self.tree.orelse == []:
                return [test]
            if isinstance(tree.orelse[0], ast.While):
                return [test] + _find_while_conditions(tree.orelse[0])

            return [test, None]

        return [Node(test) for test in _find_while_conditions(self.tree)]

    def find_while_bodies(self):
        def _find_while_bodies(tree):
            if not isinstance(tree, ast.While):
                return []
            if self.tree.orelse == []:
                return [tree.body]
            if isinstance(tree.orelse[0], ast.While):
                return [tree.body] + _find_while_bodies(tree.orelse[0])

            return [tree.body] + [tree.orelse]

        return [Node(ast.Module(body, [])) for body in _find_while_bodies(self.tree)]

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

    def find_for_bodies(self):
        def _find_for_bodies(tree):
            if not isinstance(tree, ast.For):
                return []
            if self.tree.orelse == []:
                return [tree.body]
            if isinstance(tree.orelse[0], ast.For):
                return [tree.body] + _find_for_bodies(tree.orelse[0])

            return [tree.body] + [tree.orelse]

        return [Node(ast.Module(body, [])) for body in _find_for_bodies(self.tree)]
    
    def find_if(self, if_str):
        if_list = self._find_all(ast.If)
        for if_statement in if_list:
            if if_statement.find_conditions()[0].is_equivalent(if_str):                
                return if_statement
        return Node()
            
    def find_while(self, while_str):
        while_list = self._find_all(ast.While)
        for while_loop in while_list:
            if while_loop.find_while_conditions()[0].is_equivalent(while_str):                
                return while_loop
        return Node()
            
    def find_for(self, target_str, iter_str):
        for_list = self._find_all(ast.For)
        for for_loop in for_list:
            if for_loop.find_for_vars().is_equivalent(target_str) \
                and for_loop.find_for_iter().is_equivalent(iter_str):                
                return for_loop
        return Node()
