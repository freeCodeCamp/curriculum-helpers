/* eslint-disable capitalized-comments */
/* eslint-disable max-nested-callbacks */
import {
  assertArrowFunctionExpression,
  assertBinaryExpression,
  assertCallExpression,
  assertExpressionStatement,
  assertFunctionDeclaration,
  assertIdentifier,
  assertIfStatement,
  assertImportDeclaration,
  assertImportDefaultSpecifier,
  assertImportSpecifier,
  assertMemberExpression,
  assertNumericLiteral,
  assertOptionalMemberExpression,
  assertReturnStatement,
  assertUpdateExpression,
  assertVariableDeclaration,
  assertVariableDeclarator,
  IfStatement,
  UpdateExpression,
} from "@babel/types";
import { Babeliser } from "../index";

const jsString = `
import z from "z";
import { y } from "y";

const a = 1;
let b = 2;
var c = 3;
console.log(a + b + c);
  
function add(param1, param2) {
  const tot = param1 + param2;
  let currentWeapon;
  return tot;
}
  
add(a, b);

async function sub(param1, param2) {
  (() => {
    b++;
  })();
}

await sub(1, 2);

const complexType = {
  a: 1,
  b: [1, 2, '3'],
  c: {
    d: true,
  },
  e: () => {
    const inner = 24;
  }
}

if (complexType.c?.d) {
  const q = complexType.e();
  throw new Error('error');
} else if (complexType.a === a) {
  // Do nothing
} else {
  a++;
}

while (a > 1) {
  for (let i = 0; i < c; i++) {
    switch (i) {
      case 1:
        break;
      default:
        break;
    }
  }
}
`;

const t = new Babeliser(jsString);

describe("Babeliser", () => {
  test("should correctly parse the fixture code", () => {
    expect(t.parsedCode.program.body.length).toEqual(13);
  });
});

describe(`getImportDeclarations`, () => {
  test("should find all import declarations", () => {
    expect(t.getImportDeclarations().length).toEqual(2);
  });

  test("z import declaration", () => {
    const zImportDeclaration = t.getImportDeclarations().find((i) => {
      return i.specifiers[0].local.name === "z";
    });
    assertImportDeclaration(zImportDeclaration);
    const zImportDefaultSpecifier = zImportDeclaration.specifiers[0];
    assertImportDefaultSpecifier(zImportDefaultSpecifier);
    const zSource = zImportDeclaration.source;
    expect(zSource.value).toEqual("z");
  });

  test("y import declaration", () => {
    const yImportDeclaration = t.getImportDeclarations().find((i) => {
      return i.specifiers[0].local.name === "y";
    });
    assertImportDeclaration(yImportDeclaration);
    const yImportSpecifier = yImportDeclaration.specifiers[0];
    assertImportSpecifier(yImportSpecifier);
    const yIdentifierLocal = yImportSpecifier.local;
    assertIdentifier(yIdentifierLocal);
    const yIdentifierImported = yImportSpecifier.imported;
    assertIdentifier(yIdentifierImported);
    expect(yIdentifierLocal.name).toEqual("y");
    expect(yIdentifierImported.name).toEqual("y");
    const ySource = yImportDeclaration.source;
    expect(ySource.value).toEqual("y");
  });
});

describe(`getVariableDeclarations`, () => {
  test("should find all variable declarations", () => {
    expect(t.getVariableDeclarations().length).toEqual(9);
    expect(
      t
        .getVariableDeclarations()
        .filter((v) => v.scope.join() === "global,complexType,e").length
    ).toEqual(1);
  });

  test("a variable declaration", () => {
    const aVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "a";
    });
    assertVariableDeclaration(aVariableDeclaration);
    expect(aVariableDeclaration.kind).toEqual("const");
    expect(aVariableDeclaration.scope.join()).toEqual("global");
    const aNumericLiteral = aVariableDeclaration.declarations[0].init;
    assertNumericLiteral(aNumericLiteral);
    expect(aNumericLiteral.value).toEqual(1);
  });

  test("b variable declaration", () => {
    const bVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "b";
    });
    assertVariableDeclaration(bVariableDeclaration);
    expect(bVariableDeclaration.kind).toEqual("let");
    expect(bVariableDeclaration.scope.join()).toEqual("global");
    const bNumericLiteral = bVariableDeclaration.declarations[0].init;
    assertNumericLiteral(bNumericLiteral);
    expect(bNumericLiteral.value).toEqual(2);
  });

  test("c variable declaration", () => {
    const cVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "c";
    });
    assertVariableDeclaration(cVariableDeclaration);
    expect(cVariableDeclaration.kind).toEqual("var");
    expect(cVariableDeclaration.scope.join()).toEqual("global");
    const cNumericLiteral = cVariableDeclaration.declarations[0].init;
    assertNumericLiteral(cNumericLiteral);
    expect(cNumericLiteral.value).toEqual(3);
  });

  test("complexType variable declaration", () => {
    const complexTypeVariableDeclaration = t
      .getVariableDeclarations()
      .find((v) => {
        const variableDeclarator = v.declarations[0];
        assertVariableDeclarator(variableDeclarator);
        const identifier = variableDeclarator.id;
        assertIdentifier(identifier);
        return identifier.name === "complexType";
      });
    assertVariableDeclaration(complexTypeVariableDeclaration);
    expect(complexTypeVariableDeclaration.kind).toEqual("const");
    expect(complexTypeVariableDeclaration.scope.join()).toEqual("global");
  });
  test("inner variable declaration", () => {
    const innerVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "inner";
    });
    assertVariableDeclaration(innerVariableDeclaration);
    expect(innerVariableDeclaration.kind).toEqual("const");
    expect(innerVariableDeclaration.scope.join()).toEqual(
      "global,complexType,e"
    );
    const innerNumericLiteral = innerVariableDeclaration.declarations[0].init;
    assertNumericLiteral(innerNumericLiteral);
    expect(innerNumericLiteral.value).toEqual(24);
  });
});

// EXPRESSION STATEMENTS

describe(`getExpressionStatements`, () => {
  test("should find all expression statements", () => {
    expect(t.getExpressionStatements().length).toEqual(6);
  });

  test("console expression statement", () => {
    const consoleExpression = t.getExpressionStatements().find((e) => {
      const callExpression = e.expression;
      assertCallExpression(callExpression);
      const memberExpression = callExpression.callee;
      assertMemberExpression(memberExpression);
      const object = memberExpression.object;
      assertIdentifier(object);
      const property = memberExpression.property;
      assertIdentifier(property);
      return object.name === "console" && property.name === "log";
    });

    const consoleCallExpression = consoleExpression?.expression;
    assertCallExpression(consoleCallExpression);
    const binaryExpression = consoleCallExpression.arguments[0];
    assertBinaryExpression(binaryExpression);
    const binaryExpressionLeft = binaryExpression.left;
    assertBinaryExpression(binaryExpressionLeft);
    const binaryExpressionLeftLeft = binaryExpressionLeft.left;
    assertIdentifier(binaryExpressionLeftLeft);
    const binaryExpressionLeftRight = binaryExpressionLeft.right;
    assertIdentifier(binaryExpressionLeftRight);
    const binaryExpressionRight = binaryExpression.right;
    assertIdentifier(binaryExpressionRight);
    expect(binaryExpressionLeftLeft.name).toEqual("a");
    expect(binaryExpressionLeftRight.name).toEqual("b");
    expect(binaryExpressionRight.name).toEqual("c");
  });

  test("add expression statement", () => {
    const addExpression = t.getExpressionStatements().find((e) => {
      const callExpression = e.expression;
      assertCallExpression(callExpression);
      const calleeIdentifier = callExpression.callee;
      if (calleeIdentifier.type === "Identifier") {
        assertIdentifier(calleeIdentifier);
        return calleeIdentifier.name === "add";
      }

      return false;
    });
    const addCallExpression = addExpression?.expression;
    assertCallExpression(addCallExpression);
    const addCalleeIdentifier = addCallExpression.callee;
    assertIdentifier(addCalleeIdentifier);
    expect(addCalleeIdentifier.name).toEqual("add");
    const addArguments = addCallExpression.arguments;
    const addArgOneIdentifier = addArguments[0];
    assertIdentifier(addArgOneIdentifier);
    expect(addArgOneIdentifier.name).toEqual("a");
    const addArgTwoIdentifier = addArguments[1];
    assertIdentifier(addArgTwoIdentifier);
    expect(addArgTwoIdentifier.name).toEqual("b");
  });
});

describe(`getFunctionDeclarations`, () => {
  test("should find all function declarations", () => {
    expect(t.getFunctionDeclarations().length).toEqual(2);
  });

  test("add function declaration", () => {
    const addFunction = t.getFunctionDeclarations().find((f) => {
      return f.id?.name === "add";
    });
    assertFunctionDeclaration(addFunction);
    expect(addFunction).toBeTruthy();
    const addFunctionParams = addFunction.params;
    expect(addFunctionParams.length).toEqual(2);
    const addFunctionParamOne = addFunctionParams[0];
    assertIdentifier(addFunctionParamOne);
    expect(addFunctionParamOne.name).toEqual("param1");
    const addFunctionParamTwo = addFunctionParams[1];
    assertIdentifier(addFunctionParamTwo);
    expect(addFunctionParamTwo.name).toEqual("param2");

    const totVariable = addFunction.body.body[0];
    assertVariableDeclaration(totVariable);
    const totVariableDeclarator = totVariable.declarations[0];
    assertVariableDeclarator(totVariableDeclarator);
    const totIdentifier = totVariableDeclarator.id;
    assertIdentifier(totIdentifier);
    expect(totIdentifier.name).toEqual("tot");
    const totBinaryExpression = totVariableDeclarator.init;
    assertBinaryExpression(totBinaryExpression);
    const totBinaryLeftIdentifier = totBinaryExpression.left;
    assertIdentifier(totBinaryLeftIdentifier);
    expect(totBinaryLeftIdentifier.name).toEqual("param1");
    const totBinaryRightIdentifier = totBinaryExpression.right;
    assertIdentifier(totBinaryRightIdentifier);
    expect(totBinaryRightIdentifier.name).toEqual("param2");

    const returnStatement = addFunction.body.body.find((b) => {
      return b.type === "ReturnStatement";
    });
    assertReturnStatement(returnStatement);
    const returnStatementArgument = returnStatement.argument;
    assertIdentifier(returnStatementArgument);
    expect(returnStatementArgument.name).toEqual("tot");
  });

  test("sub function declaration", () => {
    const subFunctionDeclaration = t.getFunctionDeclarations().find((f) => {
      return f.id?.name === "sub";
    });
    assertFunctionDeclaration(subFunctionDeclaration);
    expect(subFunctionDeclaration.async).toEqual(true);
  });
});
// ARROW FUNCTION EXPRESSIONS

describe(`getArrowFunctionExpressions`, () => {
  test("should find all arrow function expressions", () => {
    expect(t.getArrowFunctionExpressions().length).toEqual(2);
  });

  test("IIFE arrow function expression", () => {
    const iIFEArrowFunctionExpression = t
      .getArrowFunctionExpressions()
      .find((a) => {
        return a.scope.join() === "global,sub";
      });
    assertArrowFunctionExpression(iIFEArrowFunctionExpression);
  });
});

describe(`getType`, () => {
  test("b update expression", () => {
    const bUpdateExpression = t
      .getType<UpdateExpression>("UpdateExpression")
      .find((u) => {
        const updateExpressionArgument = u.argument;
        assertIdentifier(updateExpressionArgument);
        return updateExpressionArgument.name === "b";
      });
    assertUpdateExpression(bUpdateExpression);
    expect(bUpdateExpression.scope.join()).toEqual("global,sub");
    expect(bUpdateExpression.operator).toEqual("++");
  });

  describe("if statement", () => {
    const ifStatement = t.getType<IfStatement>("IfStatement")[0];
    test("exists", () => {
      assertIfStatement(ifStatement);
      expect(ifStatement).toBeTruthy();
    });
    describe(`.test`, () => {
      const optionalMemberExpression = ifStatement.test;
      assertOptionalMemberExpression(optionalMemberExpression);
      test("is optional", () => {
        expect(optionalMemberExpression.optional).toBeTruthy();
      });
      describe(`.object`, () => {
        const memberExpression = optionalMemberExpression.object;
        assertMemberExpression(memberExpression);

        describe(`.object`, () => {
          const objectIdentifier = memberExpression.object;
          assertIdentifier(objectIdentifier);
          test("complexType", () => {
            expect(objectIdentifier.name).toEqual("complexType");
          });
        });

        describe(`.property`, () => {
          const propertyIdentifier = memberExpression.property;
          assertIdentifier(propertyIdentifier);
          test("c", () => {
            expect(propertyIdentifier.name).toEqual("c");
          });
        });
      });
      describe(`.property`, () => {
        const propertyIdentifier = optionalMemberExpression.property;
        test("exists", () => {
          assertIdentifier(propertyIdentifier);
          expect(propertyIdentifier).toBeTruthy();
        });
        // const ifBlockStatement = ifStatement.consequent;
        // const ifAlternate = ifStatement.alternate;
      });
    });
    // describe(`.consequent`, () => {});
    // describe(`.alternate`, () => {});
  });
});

describe(`getExpressionStatement`, () => {
  describe(`console.log`, () => {
    const consoleExpressionStatement = t.getExpressionStatement("console.log");
    test("exists", () => {
      expect(consoleExpressionStatement).toBeTruthy();
    });
  });
  describe(`add`, () => {
    const addExpressionStatement = t.getExpressionStatement("add");
    test("exists", () => {
      expect(addExpressionStatement).toBeTruthy();
    });
  });
  describe(`sub`, () => {
    const subExpressionStatement = t.getExpressionStatement("sub");
    test("exists", () => {
      expect(subExpressionStatement).toBeTruthy();
    });
  });
});

describe(`generateCode`, () => {
  test("should generate code", () => {
    const addExpressionStatement = t.getExpressionStatement("add");
    assertExpressionStatement(addExpressionStatement);
    const code = t.generateCode(addExpressionStatement);
    expect(code).toEqual("add(a, b);");
  });
});

describe(`.scope`, () => {
  test("should return the scope", () => {
    const addExpressionStatement = t.getExpressionStatement("add");
    assertExpressionStatement(addExpressionStatement);
    expect(addExpressionStatement.scope.join()).toEqual("global");
  });
});

describe(`getLineAndColumnFromIndex`, () => {
  test("should return the line and column", () => {
    const aVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const id = v.declarations?.[0]?.id;
      assertIdentifier(id);
      return id.name === "a";
    });
    assertVariableDeclaration(aVariableDeclaration);
    const { start } = aVariableDeclaration;
    assertNumber(start);
    const lineAndColumn = t.getLineAndColumnFromIndex(start);
    assertNumber(lineAndColumn.line);
    assertNumber(lineAndColumn.column);
    expect(lineAndColumn.line).toEqual(5);
    expect(lineAndColumn.column).toEqual(0);
  });
});

function assertNumber(n: unknown): asserts n is number {
  expect(n).toEqual(expect.any(Number));
}
