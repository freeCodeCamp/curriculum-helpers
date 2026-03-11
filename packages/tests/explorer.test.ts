import { Explorer } from "../helpers/lib/class/explorer";

expect.extend({
  toMatchExplorer(received: Explorer, expected: string) {
    const pass = received.matches(expected);
    return {
      message: () =>
        pass
          ? `Expected ${received.toString()} not to match ${expected}`
          : `Expected ${received.toString()} to match ${expected}`,
      pass,
    };
  },
});

describe("isEmpty", () => {
  it("returns true for an empty Explorer", () => {
    const explorer = new Explorer();
    expect(explorer.isEmpty()).toBe(true);
  });

  it("returns false for a non-empty Explorer", () => {
    const explorer = new Explorer("const a = 1;");
    expect(explorer.isEmpty()).toBe(false);
  });
});

describe("toString", () => {
  it("returns 'no ast' for an empty Explorer", () => {
    const explorer = new Explorer();
    expect(explorer.toString()).toBe("no ast");
  });

  it("returns the source code for a non-empty Explorer", () => {
    const sourceCode1 = "const a = 1;";
    const explorer = new Explorer(sourceCode1);
    expect(explorer.toString()).toBe(sourceCode1);

    const sourceCode2 = "function foo() { return 42; }";
    const explorer2 = new Explorer(sourceCode2);
    expect(explorer2.toString()).toBe(sourceCode2);
  });
});

describe("matches", () => {
  it("returns true when comparing equivalent nodes", () => {
    const explorer1 = new Explorer("const a = 1;");
    expect(explorer1.matches("const a = 1;")).toBe(true);

    const explorer2 = new Explorer("function foo() { return 42; }");
    expect(explorer2.matches("function foo() { return 42; }")).toBe(true);

    const explorer3 = new Explorer("interface Bar { x: number; }");
    expect(explorer3.matches("interface Bar { x: number; }")).toBe(true);

    const explorer4 = new Explorer();
    expect(explorer4.matches("")).toBe(true);
  });

  it("returns false when comparing non-equivalent nodes", () => {
    const explorer1 = new Explorer("const a = 1;");
    expect(explorer1.matches("const b = 2;")).toBe(false);

    const explorer2 = new Explorer("function foo() { return 42; }");
    expect(explorer2.matches("function bar() { return 42; }")).toBe(false);

    const explorer3 = new Explorer("interface Bar { x: number; }");
    expect(explorer3.matches("interface Baz { x: number; }")).toBe(false);
  });

  it("ignores irrelevant whitespace", () => {
    const explorer1 = new Explorer("const a = 1;");
    expect(explorer1.matches("const a =  1;")).toBe(true);
    expect(explorer1.matches("const  a = 1; ")).toBe(true);
    expect(explorer1.matches(" const a = 1;")).toBe(true);
    expect(explorer1.matches(" const a=1; ")).toBe(true);

    const explorer2 = new Explorer("function foo() { return 42; }");
    expect(explorer2.matches("function foo( ) { return 42; }")).toBe(true);
    expect(explorer2.matches("function foo () { return 42; } ")).toBe(true);
    expect(explorer2.matches(" function foo() { return 42; }")).toBe(true);
    expect(explorer2.matches(" function foo() { return 42; } ")).toBe(true);

    const explorer3 = new Explorer("interface Bar { x: number; }");
    expect(explorer3.matches("interface Bar { x:number; }")).toBe(true);
    expect(explorer3.matches("interface Bar { x:  number; } ")).toBe(true);
    expect(explorer3.matches(" interface Bar  { x: number; }")).toBe(true);
    expect(explorer3.matches(" interface Bar { x: number; } ")).toBe(true);
  });

  it("ignores trailing semicolons", () => {
    const explorer1 = new Explorer("const a = 1;");
    expect(explorer1.matches("const a = 1")).toBe(true);

    const explorer2 = new Explorer("function foo() { return 42; }");
    expect(explorer2.matches("function foo() { return 42 }")).toBe(true);

    const explorer3 = new Explorer("interface Bar { x: number; }");
    expect(explorer3.matches("interface Bar { x: number }")).toBe(true);
  });
});

describe("getVariables", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode = "const a = 1; const b = 2;";
    const explorer = new Explorer(sourceCode);
    const variables = explorer.getVariables();
    Object.values(variables).forEach((v) => expect(v).toBeInstanceOf(Explorer));
  });

  it("returns one entry per variable", () => {
    const sourceCode = "const a = 1; const b = 2;";
    const explorer = new Explorer(sourceCode);
    const variables = explorer.getVariables();
    expect(Object.keys(variables)).toHaveLength(2);
  });

  it("returns an empty object if there are no variables", () => {
    const sourceCode = "function foo() { return 42; }";
    const explorer = new Explorer(sourceCode);
    const variables = explorer.getVariables();
    expect(Object.keys(variables)).toHaveLength(0);
  });

  it("finds all variables in the current scope", () => {
    const sourceCode = `
                    const a = 1;
                    const bar = () => 42;
                    let baz;
                    function foo() { const b = 2; };
                    class Spam { method1() { const c = 3; } }
                `;
    const explorer = new Explorer(sourceCode);
    const variables = explorer.getVariables();
    expect(Object.keys(variables)).toHaveLength(3);
    expect(variables.a.matches("const a = 1;")).toBe(true);
    expect(variables.bar.matches("const bar = () => 42;")).toBe(true);
    expect(variables.baz.matches("let baz;")).toBe(true);

    const { foo } = explorer.getFunctions();
    expect(foo.getVariables().b.matches("const b = 2;")).toBe(true);

    const { Spam } = explorer.getClasses();
    const { method1 } = Spam.getMethods();
    expect(method1.getVariables().c.matches("const c = 3;")).toBe(true);
  });
});

describe("getValue", () => {
  it("returns an Explorer object for the initializer of a variable", () => {
    const sourceCode =
      "const a = 1; const b = { x: 10 }; const c = 'hello'; const d = [1, 2, 3];";
    const explorer = new Explorer(sourceCode);
    const { a, b, c, d } = explorer.getVariables();
    const valueA = a.getValue();
    expect(valueA).toBeInstanceOf(Explorer);
    expect(valueA.toString()).toBe("1");

    const valueB = b.getValue();
    expect(valueB).toBeInstanceOf(Explorer);
    expect(valueB.matches("{ x: 10 }")).toBe(true);

    expect(b.getObjectProps().x.getValue().matches("10")).toBe(true);

    const valueC = c.getValue();
    expect(valueC).toBeInstanceOf(Explorer);
    expect(valueC.matches("'hello'")).toBe(true);

    const valueD = d.getValue();
    expect(valueD).toBeInstanceOf(Explorer);
    expect(valueD.matches("[1, 2, 3]")).toBe(true);
  });

  it("returns an empty Explorer if the variable has no initializer", () => {
    const sourceCode = "const a;";
    const explorer = new Explorer(sourceCode);
    const variables = explorer.getVariables();
    const valueA = variables.a.getValue();
    expect(valueA).toBeInstanceOf(Explorer);
    expect(valueA.isEmpty()).toBe(true);
  });
});

describe("getFunctions", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode =
      "function foo() { return 42; } function bar() { return 24; }";
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions();
    Object.values(functions).forEach((f) => expect(f).toBeInstanceOf(Explorer));
  });

  it("returns one entry per function", () => {
    const sourceCode =
      "function foo() { return 42; } function bar() { return 24; }";
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions();
    expect(Object.keys(functions)).toHaveLength(2);
  });

  it("returns an empty object if there are no functions", () => {
    const sourceCode = "const a = 1; const b = 2;";
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions();
    expect(Object.keys(functions)).toHaveLength(0);
  });

  it("finds only functions in the current scope", () => {
    const sourceCode = `
                    function foo() { return 42; }
                    function bar() { function baz() { return 24; } }
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions();
    expect(Object.keys(functions)).toHaveLength(2);
    expect(functions.foo.matches("function foo() { return 42; }")).toBe(true);
    expect(
      functions.bar.matches("function bar() { function baz() { return 24; } }"),
    ).toBe(true);
  });

  it("does not find function expressions and arrow functions assigned to variables by default", () => {
    const sourceCode = `
                    const foo = function() { return 42; };
                    const bar = () => 24;
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions();
    expect(Object.keys(functions)).toHaveLength(0);
  });

  it("finds function expressions and arrow functions assigned to variables when withVariables is true", () => {
    const sourceCode = `
                    const foo = function() { return 42; };
                    const bar = () => 24;
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(Object.keys(functions)).toHaveLength(2);
  });
});

describe("getParameters", () => {
  it("returns an array of Explorer objects for the parameters of a function or method", () => {
    const sourceCode = `
                    function foo(x: number, y: string) { return 42; }
                    const bar = (a: boolean) => 24;
                    const baz = function(b: any, c: string) { return 42; };
                    class Spam { method(d: number) { return 42; } }
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    const parametersFoo = functions.foo.getParameters();
    expect(parametersFoo).toHaveLength(2);

    expect(parametersFoo[0].matches("x: number")).toBe(true);
    expect(parametersFoo[1].matches("y: string")).toBe(true);

    const parametersBar = functions.bar.getParameters();
    expect(parametersBar).toHaveLength(1);
    expect(parametersBar[0].matches("a: boolean")).toBe(true);

    const parametersBaz = functions.baz.getParameters();
    expect(parametersBaz).toHaveLength(2);
    expect(parametersBaz[0].matches("b: any")).toBe(true);
    expect(parametersBaz[1].matches("c: string")).toBe(true);

    expect(
      explorer.getClasses().Spam.getMethods().method.getParameters(),
    ).toHaveLength(1);
    expect(
      explorer
        .getClasses()
        .Spam.getMethods()
        .method.getParameters()[0]
        .matches("d: number"),
    ).toBe(true);
  });

  it("returns an empty array if the function or method has no parameters", () => {
    const sourceCode = `
                    function foo() { return 42; }
                    const bar = () => 24;
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    const parametersFoo = functions.foo.getParameters();
    expect(parametersFoo).toHaveLength(0);

    const parametersBar = functions.bar.getParameters();
    expect(parametersBar).toHaveLength(0);
  });
});

describe("hasReturnAnnotation", () => {
  it("returns true if the function or method has the specified return type annotation", () => {
    const sourceCode = `
                    function foo(): number { return 42; }
                    const bar = (): string => "hello";
                    const baz = function(): boolean { return true; };
                    class Spam { method(): number { return 42; } }
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(functions.foo.hasReturnAnnotation("number")).toBe(true);
    expect(functions.bar.hasReturnAnnotation("string")).toBe(true);
    expect(functions.baz.hasReturnAnnotation("boolean")).toBe(true);
    expect(
      explorer
        .getClasses()
        .Spam.getMethods()
        .method.hasReturnAnnotation("number"),
    ).toBe(true);
  });

  it("returns false if the function or method does not have the specified return type annotation", () => {
    const sourceCode = `
                    function foo(): number { return 42; }
                    const bar = (): string => "hello";
                    class Spam { method(): number { return 42; } }
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(functions.foo.hasReturnAnnotation("string")).toBe(false);
    expect(functions.bar.hasReturnAnnotation("number")).toBe(false);
    expect(
      explorer
        .getClasses()
        .Spam.getMethods()
        .method.hasReturnAnnotation("string"),
    ).toBe(false);
  });

  it("returns false if the function or method has no return type annotation", () => {
    const sourceCode = `
                    function foo() { return 42; }
                    const bar = () => "hello";
                    class Spam { method() { return 42; } }
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(functions.foo.hasReturnAnnotation("number")).toBe(false);
    expect(functions.bar.hasReturnAnnotation("string")).toBe(false);
    expect(
      explorer
        .getClasses()
        .Spam.getMethods()
        .method.hasReturnAnnotation("number"),
    ).toBe(false);
  });
});

describe("hasReturn", () => {
  it("returns true if the function or method has a top-level return value matching the specified string", () => {
    const sourceCode = `function foo() { return 42; }
                    const bar = () => "hello";
                    const baz = function() { return true; };
                    class Spam { method() { return 42; } }
                    const nested1 = () => { function inner() { return "nested"; } return inner(); };
                    const nested2 = () => { if (true) { return "nested"; } return "not nested"; };
                `;
    const explorer = new Explorer(sourceCode);
    const { foo, bar, baz, nested1, nested2 } = explorer.getFunctions(true);
    expect(foo.hasReturn("42")).toBe(true);
    expect(bar.hasReturn('"hello"')).toBe(true);
    expect(baz.hasReturn("true")).toBe(true);
    expect(nested1.hasReturn("inner()")).toBe(true);
    expect(nested2.hasReturn('"not nested"')).toBe(true);

    const { method } = explorer.getClasses().Spam.getMethods();
    expect(method.hasReturn("42")).toBe(true);
  });
});

describe("getTypes", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode = "type Foo = { x: number; }; type Bar = { y: string; };";
    const explorer = new Explorer(sourceCode);
    const types = explorer.getTypes();
    Object.values(types).forEach((t) => expect(t).toBeInstanceOf(Explorer));
  });

  it("returns one entry per type", () => {
    const sourceCode = "type Foo = { x: number; }; type Bar = { y: string; };";
    const explorer = new Explorer(sourceCode);
    const types = explorer.getTypes();
    expect(Object.keys(types)).toHaveLength(2);
  });

  it("returns an empty object if there are no types", () => {
    const sourceCode = "const a = 1; const b = 2;";
    const explorer = new Explorer(sourceCode);
    const types = explorer.getTypes();
    expect(Object.keys(types)).toHaveLength(0);
  });

  it("finds only types in the current scope", () => {
    const sourceCode = `
                    type Foo = { x: number; };
                    function bar() { type Baz = { y: string; }; }
                `;
    const explorer = new Explorer(sourceCode);
    const types = explorer.getTypes();
    expect(Object.keys(types)).toHaveLength(1);
    expect(types.Foo.matches("type Foo = { x: number; };")).toBe(true);
  });
});

describe("getInterfaces", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode =
      "interface Foo { x: number; } interface Bar { y: string; }";
    const explorer = new Explorer(sourceCode);
    const interfaces = explorer.getInterfaces();
    Object.values(interfaces).forEach((i) =>
      expect(i).toBeInstanceOf(Explorer),
    );
  });

  it("returns one entry per interface", () => {
    const sourceCode =
      "interface Foo { x: number; } interface Bar { y: string; }";
    const explorer = new Explorer(sourceCode);
    const interfaces = explorer.getInterfaces();
    expect(Object.keys(interfaces)).toHaveLength(2);
  });

  it("returns an empty object if there are no interfaces", () => {
    const sourceCode = "const a = 1; const b = 2;";
    const explorer = new Explorer(sourceCode);
    const interfaces = explorer.getInterfaces();
    expect(Object.keys(interfaces)).toHaveLength(0);
  });

  it("finds only interfaces in the current scope", () => {
    const sourceCode = `
                    interface Foo { x: number; }
                    function bar() { interface Baz { y: string; } }
                `;
    const explorer = new Explorer(sourceCode);
    const interfaces = explorer.getInterfaces();
    expect(Object.keys(interfaces)).toHaveLength(1);
    expect(interfaces.Foo.matches("interface Foo { x: number; }")).toBe(true);
  });
});

describe("getClasses", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode = "class Foo { x: number; } class Bar { y: string; }";
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    Object.values(classes).forEach((c) => expect(c).toBeInstanceOf(Explorer));
  });

  it("returns one entry per class", () => {
    const sourceCode = "class Foo { x: number; } class Bar { y: string; }";
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes)).toHaveLength(2);
  });

  it("returns an empty object if there are no classes", () => {
    const sourceCode = "const a = 1; const b = 2;";
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes)).toHaveLength(0);
  });

  it("finds only classes in the current scope", () => {
    const sourceCode = `
                    class Foo { x: number; }
                    function bar() { class Baz { y: string; } }
                `;
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes)).toHaveLength(1);
    expect(classes.Foo.matches("class Foo { x: number; }")).toBe(true);
  });
});

describe("getMethods", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode = "class Foo { method1() {} method2() {} }";
    const explorer = new Explorer(sourceCode);
    const methods = explorer.getMethods();
    Object.values(methods).forEach((m) => expect(m).toBeInstanceOf(Explorer));
  });

  it("returns one entry per method", () => {
    const sourceCode = "class Foo { method1() {} method2() {} }";
    const explorer = new Explorer(sourceCode);
    const methods = explorer.getClasses().Foo.getMethods();
    expect(Object.keys(methods)).toHaveLength(2);
  });

  it("returns an empty object if there are no methods", () => {
    const sourceCode = "class Foo { }";
    const explorer = new Explorer(sourceCode);
    const methods = explorer.getClasses().Foo.getMethods();
    expect(Object.keys(methods)).toHaveLength(0);
  });

  it("does not find methods unless called on a class Explorer", () => {
    const sourceCode = `
const x = 1;
class Foo { method1() {} }
`;

    const explorer = new Explorer(sourceCode);
    const methods = explorer.getMethods();
    expect(Object.keys(methods)).toHaveLength(0);

    const classExplorer = explorer.getClasses().Foo;
    const methodsInClass = classExplorer.getMethods();
    expect(Object.keys(methodsInClass)).toHaveLength(1);
  });

  it("only finds methods when called on a single class Explorer", () => {
    const sourceCode = `
class Foo { method1() {} }
class Bar { method2() {} }
`;
    const explorer = new Explorer(sourceCode);
    const methods = explorer.getMethods();
    expect(Object.keys(methods)).toHaveLength(0);
  });
});

describe("getConstructor", () => {
  it("returns an Explorer object for the constructor of a class", () => {
    const sourceCode =
      "class Foo { constructor(a, b) { this.a = a; this.b = b; } }";
    const explorer = new Explorer(sourceCode);
    const constructor = explorer.getClasses().Foo.getConstructor();
    expect(constructor).toBeInstanceOf(Explorer);
    expect(
      constructor.matches("constructor(a, b) { this.a = a; this.b = b; }"),
    ).toBe(true);
  });
});

describe("getClassProps", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode = "class Foo { prop1: number; prop2: string; }";
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    Object.values(Foo.getClassProps()).forEach((p) =>
      expect(p).toBeInstanceOf(Explorer),
    );
  });

  it("finds properties assigned in the constructor when includeConstructor is true", () => {
    const sourceCode = `
                    class Rectangle {
                      constructor(height, width) {
                        this.height = height;
                        this.width = width;
                      }
                    }
                `;
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    const props = classes.Rectangle.getClassProps(true);
    Object.values(props).forEach((p) => expect(p).toBeInstanceOf(Explorer));
  });

  it("returns one entry per property", () => {
    const sourceCode = `
                    class Rectangle {
                      constructor(height, width) {
                        this.height = height;
                        this.width = width;
                      }
                    }
                    class Foo { prop1: number; prop2: string; }
                `;
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes.Rectangle.getClassProps(true))).toHaveLength(2);
    expect(Object.keys(classes.Foo.getClassProps())).toHaveLength(2);
  });

  it("returns an empty object if there are no properties", () => {
    const sourceCode = "class Foo { }";
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes.Foo.getClassProps())).toHaveLength(0);
  });

  it("finds only properties in the current class", () => {
    const sourceCode = `
                      class Foo { private prop1: number; }
                      class Bar { prop2: string; }
                  `;
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes.Foo.getClassProps())).toHaveLength(1);
    expect(
      classes.Foo.getClassProps().prop1.matches("private prop1: number;"),
    ).toBe(true);

    expect(Object.keys(classes.Bar.getClassProps())).toHaveLength(1);
    expect(classes.Bar.getClassProps().prop2.matches("prop2: string;")).toBe(
      true,
    );
  });
});

describe("isPrivate", () => {
  it("returns true if the method, property is private", () => {
    const sourceCode = `
                    class Foo {
                      private prop1: number;
                      private method1() {}
                    }
                `;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isPrivate()).toBe(true);
    expect(Foo.getMethods().method1.isPrivate()).toBe(true);
  });

  it("returns false if the method or property is not private", () => {
    const sourceCode = `
                    class Foo {
                      public prop1: number;
                      public method1() {}
                    }
                `;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isPrivate()).toBe(false);
    expect(Foo.getMethods().method1.isPrivate()).toBe(false);
  });
});

describe("isProtected", () => {
  it("returns true if the method, property is protected", () => {
    const sourceCode = `class Foo {
                      protected prop1: number;
                      protected method1() {}
                    }`;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isProtected()).toBe(true);
    expect(Foo.getMethods().method1.isProtected()).toBe(true);
  });

  it("returns false if the method or property is not protected", () => {
    const sourceCode = `class Foo {
                      public prop1: number;
                      public method1() {}
                    }`;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isProtected()).toBe(false);
    expect(Foo.getMethods().method1.isProtected()).toBe(false);
  });
});

describe("isPublic", () => {
  it("returns true if the method, property is public", () => {
    const sourceCode = `class Foo {
                      public prop1: number;
                      public method1() {}
                    }`;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isPublic()).toBe(true);
    expect(Foo.getMethods().method1.isPublic()).toBe(true);
  });

  it("returns false if the method or property is not public", () => {
    const sourceCode = `class Foo {
                      prop1: number;
                      private method1() {}
                    }`;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isPublic()).toBe(false);
    expect(Foo.getMethods().method1.isPublic()).toBe(false);
  });
});

describe("isReadOnly", () => {
  it("returns true if the property is readonly", () => {
    const sourceCode = `class Foo {
                      private readonly prop1: number;
                    }
                    interface Bar {
                      readonly prop2: string;
                    }`;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isReadOnly()).toBe(true);
    const { Bar } = explorer.getInterfaces();
    expect(Bar.getTypeProps().prop2.isReadOnly()).toBe(true);
  });

  it("returns false if the property is not readonly", () => {
    const sourceCode = `class Foo {
                      private prop1: number;
                    }
                    interface Bar {
                      prop2: string;
                    }`;
    const explorer = new Explorer(sourceCode);
    const { Foo } = explorer.getClasses();
    expect(Foo.getClassProps().prop1.isReadOnly()).toBe(false);
    const { Bar } = explorer.getInterfaces();
    expect(Bar.getTypeProps().prop2.isReadOnly()).toBe(false);
  });
});

describe("annotations", () => {
  describe("getAnnotation", () => {
    it("returns an Explorer object if the annotation exists", () => {
      const sourceCode = `
                    const a: number = 1;
                    function foo(x: number, y: string): void { }
                    interface Bar { x: number; }
                    class Baz { spam: "spam" = "spam"; }
                `;
      const explorer = new Explorer(sourceCode);
      const varAnnotation = explorer.getVariables().a.getAnnotation();
      expect(varAnnotation).toBeInstanceOf(Explorer);
      expect(varAnnotation.toString()).toBe("number");
    });
  });

  describe("hasAnnotation", () => {
    it("returns true if the specified annotation exists", () => {
      const sourceCode = `
                    const a: number = 1;
                    const b: { x: number; y: string; } = { x: 10, y: "hello" };
                    function foo(x: number, y: string): void { }
                    interface Bar { x: number; }
                    class Baz { spam: "spam" = "spam"; }
                `;
      const explorer = new Explorer(sourceCode);
      const { a, b } = explorer.getVariables();
      expect(a.hasAnnotation("number")).toBe(true);

      expect(b.hasAnnotation("{ x: number; y: string; }")).toBe(true);
      expect(b.getAnnotation().getTypeProps().x.hasAnnotation("number")).toBe(
        true,
      );
      expect(b.getAnnotation().getTypeProps().y.hasAnnotation("string")).toBe(
        true,
      );

      const parametersFoo = explorer.getFunctions().foo.getParameters();
      expect(parametersFoo[0].hasAnnotation("number")).toBe(true);
      expect(parametersFoo[1].hasAnnotation("string")).toBe(true);

      const interfaceBar = explorer.getInterfaces().Bar;
      expect(interfaceBar.getTypeProps().x.hasAnnotation("number")).toBe(true);

      const classBaz = explorer.getClasses().Baz;
      expect(classBaz.getClassProps().spam.hasAnnotation('"spam"')).toBe(true);
    });

    it("returns false if the annotation is different from the argument", () => {
      const sourceCode = `
                    const a: number = 1;
                    function foo(x: number, y: string): void { }
                    interface Bar { x: number; }
                    class Baz { spam: "spam" = "spam"; }
                `;
      const explorer = new Explorer(sourceCode);
      expect(explorer.getVariables().a.hasAnnotation("string")).toBe(false);

      const parametersFoo = explorer.getFunctions().foo.getParameters();
      expect(parametersFoo[0].hasAnnotation("string")).toBe(false);
      expect(parametersFoo[1].hasAnnotation("number")).toBe(false);

      const interfaceBar = explorer.getInterfaces().Bar;
      expect(interfaceBar.getTypeProps().x.hasAnnotation("string")).toBe(false);

      const classBaz = explorer.getClasses().Baz;
      expect(classBaz.getClassProps().spam.hasAnnotation('"eggs"')).toBe(false);
    });

    it("returns false if the value is not annotated", () => {
      const sourceCode = `
                    const a = 1;
                    function foo(x, y) { }
                `;
      const explorer = new Explorer(sourceCode);
      expect(explorer.getVariables().a.hasAnnotation("number")).toBe(false);

      const parametersFoo = explorer.getFunctions().foo.getParameters();
      expect(parametersFoo[0].hasAnnotation("number")).toBe(false);
      expect(parametersFoo[1].hasAnnotation("string")).toBe(false);
    });
  });

  describe("isUnionOf", () => {
    it("returns true if the type is a union of the specified types", () => {
      const sourceCode = `
                    const a: number | string = 1;
                    const b: "foo" | "bar" | "baz" = "foo";
                    type MyType = number | string | boolean;
                    interface MyInterface { prop: number | string | boolean; }
                `;
      const explorer = new Explorer(sourceCode);
      expect(explorer.getVariables().a.isUnionOf(["number", "string"])).toBe(
        true,
      );
      expect(
        explorer.getVariables().b.isUnionOf(['"bar"', '"foo"', '"baz"']),
      ).toBe(true);
      expect(
        explorer.getTypes().MyType.isUnionOf(["number", "boolean", "string"]),
      ).toBe(true);
      expect(
        explorer
          .getInterfaces()
          .MyInterface.getTypeProps()
          .prop.isUnionOf(["number", "boolean", "string"]),
      ).toBe(true);
    });

    it("returns false if the type is not a union of the specified types", () => {
      const sourceCode = `
                    const a: number | string = 1;
                    const b: "foo" | "bar" | "baz" = "foo";
                    type MyType = number | string | boolean;
                    interface MyInterface { prop: number | string | boolean; }
                `;
      const explorer = new Explorer(sourceCode);
      expect(explorer.getVariables().a.isUnionOf(["number", "boolean"])).toBe(
        false,
      );
      expect(
        explorer.getVariables().b.isUnionOf(['"bar"', '"foo"', '"qux"']),
      ).toBe(false);
      expect(explorer.getTypes().MyType.isUnionOf(["number", "string"])).toBe(
        false,
      );
      expect(
        explorer
          .getInterfaces()
          .MyInterface.getTypeProps()
          .prop.isUnionOf(["number", "string"]),
      ).toBe(false);
    });
  });
});

describe("getObjectProps", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode =
      "const obj: {[name: string]: number} = { x: 10, y: 20 };";
    const explorer = new Explorer(sourceCode);
    const objectProps = explorer.getVariables().obj.getObjectProps();
    Object.values(objectProps).forEach((p) =>
      expect(p).toBeInstanceOf(Explorer),
    );
  });

  it("returns one entry per property", () => {
    const sourceCode =
      "const obj: {[name: string]: number} = { x: 10, y: 20 };";
    const explorer = new Explorer(sourceCode);
    const objectProps = explorer.getVariables().obj.getObjectProps();
    expect(Object.keys(objectProps)).toHaveLength(2);
  });

  it("returns an empty object if there are no properties", () => {
    const sourceCode = "const obj: {[name: string]: number} = { };";
    const explorer = new Explorer(sourceCode);
    const objectProps = explorer.getVariables().obj.getObjectProps();
    expect(Object.keys(objectProps)).toHaveLength(0);
  });
});

describe("getTypeProps", () => {
  it("returns an object with Explorer objects as values", () => {
    const sourceCode = `
                    type Foo = { x: number; y: string; };
                    interface Bar { a: boolean; b: any; }
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    Object.values(typeFoo.getTypeProps()).forEach((p) =>
      expect(p).toBeInstanceOf(Explorer),
    );

    const interfaceBar = explorer.getInterfaces().Bar;
    Object.values(interfaceBar.getTypeProps()).forEach((p) =>
      expect(p).toBeInstanceOf(Explorer),
    );
  });

  it("returns one entry per type prop", () => {
    const sourceCode = `
                    type Foo = { x: number; y: string; };
                    interface Bar { a: boolean; b: any; }
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    expect(Object.keys(typeFoo.getTypeProps())).toHaveLength(2);

    const interfaceBar = explorer.getInterfaces().Bar;
    expect(Object.keys(interfaceBar.getTypeProps())).toHaveLength(2);
  });

  it("returns an empty object if there are no type props", () => {
    const sourceCode = `
                    type Foo = { };
                    interface Bar { }
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    expect(Object.keys(typeFoo.getTypeProps())).toHaveLength(0);

    const interfaceBar = explorer.getInterfaces().Bar;
    expect(Object.keys(interfaceBar.getTypeProps())).toHaveLength(0);
  });
});

describe("hasTypeProps", () => {
  it("returns false if there are no type props", () => {
    const sourceCode = `
                    type Foo = { };
                    interface Bar { }
                    let baz: { };
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    expect(typeFoo.hasTypeProps([{ name: "x" }])).toBe(false);

    const interfaceBar = explorer.getInterfaces().Bar;
    expect(interfaceBar.hasTypeProps([{ name: "y" }])).toBe(false);

    const varBaz = explorer.getVariables().baz;
    expect(varBaz.hasTypeProps([{ name: "z" }])).toBe(false);
  });

  it("returns false if the argument is an empty array", () => {
    const sourceCode = `
                    type Foo = { };
                    interface Bar { y: string; }
                    let baz: { z: boolean; };
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    expect(typeFoo.hasTypeProps([])).toBe(false);

    const interfaceBar = explorer.getInterfaces().Bar;
    expect(interfaceBar.hasTypeProps([])).toBe(false);

    const varBaz = explorer.getVariables().baz;
    expect(varBaz.hasTypeProps([])).toBe(false);
  });

  it("returns true if the specified type prop(s) exist", () => {
    const sourceCode = `
                    type Foo = { x: number; y: string; z: boolean; };
                    interface Bar { x: number; y?: string; }
                    let baz: { x?: number; y: string; };
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    expect(typeFoo.hasTypeProps({ name: "x" })).toBe(true);
    expect(
      typeFoo.hasTypeProps([
        { name: "x", type: "number" },
        { name: "y", type: "string" },
      ]),
    ).toBe(true);

    const interfaceBar = explorer.getInterfaces().Bar;
    expect(interfaceBar.hasTypeProps({ name: "x" })).toBe(true);
    expect(
      interfaceBar.hasTypeProps([
        { name: "x", type: "number" },
        { name: "y", type: "string", isOptional: true },
      ]),
    ).toBe(true);

    const varBaz = explorer.getVariables().baz;
    expect(varBaz.hasTypeProps({ name: "y" })).toBe(true);
    expect(
      varBaz.hasTypeProps([{ name: "x", isOptional: true }, { name: "y" }]),
    ).toBe(true);
  });

  it("returns false if any of the specified type prop(s) does not exist", () => {
    const sourceCode = `
                    type Foo = { x: number; y: string; z: boolean; };
                    interface Bar { x: number; y?: string; }
                    let baz: { x?: number; y: string; };
                `;
    const explorer = new Explorer(sourceCode);
    const typeFoo = explorer.getTypes().Foo;
    expect(typeFoo.hasTypeProps({ name: "a" })).toBe(false);
    expect(
      typeFoo.hasTypeProps([
        { name: "x", type: "number" },
        { name: "a", type: "string" },
      ]),
    ).toBe(false);

    const interfaceBar = explorer.getInterfaces().Bar;
    expect(interfaceBar.hasTypeProps({ name: "a" })).toBe(false);
    expect(
      interfaceBar.hasTypeProps([
        { name: "x", type: "number" },
        { name: "a", type: "string", isOptional: true },
      ]),
    ).toBe(false);

    const varBaz = explorer.getVariables().baz;
    expect(varBaz.hasTypeProps({ name: "a" })).toBe(false);
    expect(varBaz.hasTypeProps([{ name: "x", isOptional: false }])).toBe(false);
  });
});

describe("querying statements", () => {
  describe("getVariables in different scopes", () => {
    it("finds variables in SourceFile scope", () => {
      const sourceCode = `
        const a = 1;
        let b = 2;
      `;
      const explorer = new Explorer(sourceCode);
      const variables = explorer.getVariables();
      expect(Object.keys(variables)).toHaveLength(2);
      expect(variables.a.matches("const a = 1;")).toBe(true);
      expect(variables.b.matches("let b = 2;")).toBe(true);
    });

    it("finds variables in Block scope", () => {
      const sourceCode = `
        function foo() {
          const x = 10;
          let y = 20;
        }
        const bar = () => {
          const z = 30;
        };
      `;
      const explorer = new Explorer(sourceCode);
      const functions = explorer.getFunctions(true);
      const fooVars = functions.foo.getVariables();

      expect(Object.keys(fooVars)).toHaveLength(2);
      expect(fooVars.x.matches("const x = 10;")).toBe(true);
      expect(fooVars.y.matches("let y = 20;")).toBe(true);

      const barVars = functions.bar.getVariables();
      expect(Object.keys(barVars)).toHaveLength(1);
      expect(barVars.z.matches("const z = 30;")).toBe(true);
    });

    it.todo("finds variables in ModuleBlock scope", () => {});

    it.todo("finds variables in CaseOrDefaultClause scope", () => {});
  });
});

describe("hasCast", () => {
  it("returns true if the variable is initialized with a type assertion", () => {
    const explorer = new Explorer("const a = 1 as number;");
    const variables = explorer.getVariables();
    expect(variables.a.getValue().hasCast()).toBe(true);
  });

  it("returns false if the variable is not initialized with a type assertion", () => {
    const explorer = new Explorer("const a = 1;");
    const variables = explorer.getVariables();
    expect(variables.a.getValue().hasCast()).toBe(false);
  });

  it("returns true if the variable is cast to the specified type ", () => {
    const explorer = new Explorer("const a = 1 as number;");
    const variables = explorer.getVariables();
    expect(variables.a.getValue().hasCast("number")).toBe(true);
    // TODO: handle values cast with angle bracket syntax in hasCast().
  });

  it("returns false if the variable is cast to a different type than the specified one", () => {
    const explorer = new Explorer("const a = 1 as number;");
    const variables = explorer.getVariables();
    expect(variables.a.getValue().hasCast("string")).toBe(false);
  });
});

describe("hasNonNullAssertion", () => {
  it("returns true if the variable is initialized with a non-null assertion", () => {
    const explorer = new Explorer("const a = someValue!;");
    const variables = explorer.getVariables();
    expect(variables.a.getValue().hasNonNullAssertion()).toBe(true);
    expect(variables.a.getValue().matches("someValue!")).toBe(true);
  });

  it("returns false if the variable is not initialized with a non-null assertion", () => {
    const explorer = new Explorer("const a = someValue;");
    const variables = explorer.getVariables();
    expect(variables.a.getValue().hasNonNullAssertion()).toBe(false);
  });
});

describe("doesExtend", () => {
  it("returns true if the class/interface extends the specified base class", () => {
    const explorer = new Explorer(
      "class Foo extends Bar, Baz { }; interface Baz extends Bar, Baz { }",
    );
    const classes = explorer.getClasses();
    expect(classes.Foo.doesExtend("Bar")).toBe(true);
    expect(classes.Foo.doesExtend("Baz")).toBe(true);

    const interfaces = explorer.getInterfaces();
    expect(interfaces.Baz.doesExtend("Bar")).toBe(true);
    expect(interfaces.Baz.doesExtend("Baz")).toBe(true);
  });

  it("returns false if the class/interface does not extend the specified base class", () => {
    const explorer = new Explorer(
      "class Foo extends Bar { }; interface Baz extends Bar { }",
    );
    const classes = explorer.getClasses();
    expect(classes.Foo.doesExtend("Baz")).toBe(false);

    const interfaces = explorer.getInterfaces();
    expect(interfaces.Baz.doesExtend("Foo")).toBe(false);
  });

  it("returns false if the class/interface does not have an extends clause", () => {
    const explorer = new Explorer("class Foo { }; interface Baz { }");
    const classes = explorer.getClasses();
    expect(classes.Foo.doesExtend("Bar")).toBe(false);

    const interfaces = explorer.getInterfaces();
    expect(interfaces.Baz.doesExtend("Bar")).toBe(false);
  });
});

describe("doesImplement", () => {
  it("returns true if the class implements the specified interface", () => {
    const explorer = new Explorer(
      "class Foo implements Bar { }; class Baz implements Bar, Other { }",
    );
    const classes = explorer.getClasses();
    expect(classes.Foo.doesImplement("Bar")).toBe(true);

    expect(classes.Baz.doesImplement(["Bar", "Other"])).toBe(true);
  });

  it("returns false if the class does not implement the specified interface", () => {
    const explorer = new Explorer("class Foo implements Other { }");
    const classes = explorer.getClasses();
    expect(classes.Foo.doesImplement("Bar")).toBe(false);
  });
});
