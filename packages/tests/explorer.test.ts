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
  it("returns an array of Explorer objects for the parameters of a function", () => {
    const sourceCode = `
                    function foo(x: number, y: string) { return 42; }
                    const bar = (a: boolean) => 24;
                    const baz = function(b: any, c: string) { return 42; };
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    const parametersFoo = functions.foo.getParameters();
    expect(parametersFoo).toHaveLength(2);
    // TODO: handles comparison of parameters in matches().
    // This doesn't ignore whitespace
    expect(parametersFoo[0].toString()).toBe("x: number");
    expect(parametersFoo[1].toString()).toBe("y: string");

    const parametersBar = functions.bar.getParameters();
    expect(parametersBar).toHaveLength(1);
    expect(parametersBar[0].toString()).toBe("a: boolean");

    const parametersBaz = functions.baz.getParameters();
    expect(parametersBaz).toHaveLength(2);
    expect(parametersBaz[0].toString()).toBe("b: any");
    expect(parametersBaz[1].toString()).toBe("c: string");
  });

  it("returns an empty array if the function has no parameters", () => {
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
  it("returns true if the function has the specified return type annotation", () => {
    const sourceCode = `
                    function foo(): number { return 42; }
                    const bar = (): string => "hello";
                    const baz = function(): boolean { return true; };
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(functions.foo.hasReturnAnnotation("number")).toBe(true);
    expect(functions.bar.hasReturnAnnotation("string")).toBe(true);
    expect(functions.baz.hasReturnAnnotation("boolean")).toBe(true);
  });

  it("returns false if the function does not have the specified return type annotation", () => {
    const sourceCode = `
                    function foo(): number { return 42; }
                    const bar = (): string => "hello";
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(functions.foo.hasReturnAnnotation("string")).toBe(false);
    expect(functions.bar.hasReturnAnnotation("number")).toBe(false);
  });

  it("returns false if the function has no return type annotation", () => {
    const sourceCode = `
                    function foo() { return 42; }
                    const bar = () => "hello";
                `;
    const explorer = new Explorer(sourceCode);
    const functions = explorer.getFunctions(true);
    expect(functions.foo.hasReturnAnnotation("number")).toBe(false);
    expect(functions.bar.hasReturnAnnotation("string")).toBe(false);
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

describe("findClassProps", () => {
  it("returns an object with Explorer objects as values", () => {
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
    Object.values(classes.Rectangle.getClassProps()).forEach((p) =>
      expect(p).toBeInstanceOf(Explorer),
    );
    Object.values(classes.Foo.getClassProps()).forEach((p) =>
      expect(p).toBeInstanceOf(Explorer),
    );
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
    // TODO: fix method to handle expect(Object.keys(classes.Rectangle.getClassProps())).toHaveLength(2);
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
                      class Foo { prop1: number; }
                      class Bar { prop2: string; }
                  `;
    const explorer = new Explorer(sourceCode);
    const classes = explorer.getClasses();
    expect(Object.keys(classes.Foo.getClassProps())).toHaveLength(1);
    // TODO: fix matches to handle
    // expect(classes.Foo.getClassProps().prop1.matches("prop1: number;")).toBe(true);
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
      // TODO: handles comparison of annotations in matches(). This doesn't ignore whitespace
      expect(varAnnotation.toString()).toBe("number");
    });
  });

  describe("hasAnnotation", () => {
    it("returns true if the specified annotation exists", () => {
      const sourceCode = `
                    const a: number = 1;
                    function foo(x: number, y: string): void { }
                    interface Bar { x: number; }
                    class Baz { spam: "spam" = "spam"; }
                `;
      const explorer = new Explorer(sourceCode);
      expect(explorer.getVariables().a.hasAnnotation("number")).toBe(true);

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
      `;
      const explorer = new Explorer(sourceCode);
      const variables = explorer.getFunctions().foo.getVariables();

      expect(Object.keys(variables)).toHaveLength(2);
      expect(variables.x.matches("const x = 10;")).toBe(true);
      expect(variables.y.matches("let y = 20;")).toBe(true);
    });

    it.todo("finds variables in ModuleBlock scope", () => {});

    it.todo("finds variables in CaseOrDefaultClause scope", () => {});
  });
});
