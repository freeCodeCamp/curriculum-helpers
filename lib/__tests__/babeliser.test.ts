/**
 * @jest-environment jsdom
 */
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
  CallExpression,
  IfStatement,
  is,
  UpdateExpression,
} from "@babel/types";
import { assert } from "chai";

const t = new Babeliser(jsString);

describe("Babeliser", () => {
  it("should correctly parse the fixture code", () => {
    assert.equal(t.parsedCode.program.body.length, 13);
  });
});

// IMPORT DECLARATIONS

describe(`getImportDeclarations`, () => {
  it("should find all import declarations", () => {
    assert.equal(t.getImportDeclarations().length, 2);
  });

  it("z import declaration", () => {
    const zImportDeclaration = t.getImportDeclarations().find((i) => {
      return i.specifiers[0].local.name === "z";
    });
    assertImportDeclaration(zImportDeclaration);
    const zImportDefaultSpecifier = zImportDeclaration.specifiers[0];
    assertImportDefaultSpecifier(zImportDefaultSpecifier);
    const zSource = zImportDeclaration.source;
    assert.equal(zSource.value, "z");
  });

  it("y import declaration", () => {
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
    assert.equal(yIdentifierLocal.name, "y");
    assert.equal(yIdentifierImported.name, "y");
    const ySource = yImportDeclaration.source;
    assert.equal(ySource.value, "y");
  });
});
// VARIABLE DECLARATIONS

describe(`getVariableDeclarations`, () => {
  it("should find all variable declarations", () => {
    assert.equal(t.getVariableDeclarations().length, 9);
    assert.equal(
      t
        .getVariableDeclarations()
        .filter((v) => v.scope.join() === "global,complexType,e").length,
      1
    );
  });

  it("a variable declaration", () => {
    const aVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "a";
    });
    assertVariableDeclaration(aVariableDeclaration);
    assert.equal(aVariableDeclaration.kind, "const");
    assert.equal(aVariableDeclaration.scope.join(), "global");
    const aNumericLiteral = aVariableDeclaration.declarations[0].init;
    assertNumericLiteral(aNumericLiteral);
    assert.equal(aNumericLiteral.value, 1);
  });

  it("b variable declaration", () => {
    const bVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "b";
    });
    assertVariableDeclaration(bVariableDeclaration);
    assert.equal(bVariableDeclaration.kind, "let");
    assert.equal(bVariableDeclaration.scope.join(), "global");
    const bNumericLiteral = bVariableDeclaration.declarations[0].init;
    assertNumericLiteral(bNumericLiteral);
    assert.equal(bNumericLiteral.value, 2);
  });

  it("c variable declaration", () => {
    const cVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "c";
    });
    assertVariableDeclaration(cVariableDeclaration);
    assert.equal(cVariableDeclaration.kind, "var");
    assert.equal(cVariableDeclaration.scope.join(), "global");
    const cNumericLiteral = cVariableDeclaration.declarations[0].init;
    assertNumericLiteral(cNumericLiteral);
    assert.equal(cNumericLiteral.value, 3);
  });

  it("complexType variable declaration", () => {
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
    assert.equal(complexTypeVariableDeclaration.kind, "const");
    assert.equal(complexTypeVariableDeclaration.scope.join(), "global");
  });
  it("inner variable declaration", () => {
    const innerVariableDeclaration = t.getVariableDeclarations().find((v) => {
      const variableDeclarator = v.declarations[0];
      assertVariableDeclarator(variableDeclarator);
      const identifier = variableDeclarator.id;
      assertIdentifier(identifier);
      return identifier.name === "inner";
    });
    assertVariableDeclaration(innerVariableDeclaration);
    assert.equal(innerVariableDeclaration.kind, "const");
    assert.equal(innerVariableDeclaration.scope.join(), "global,complexType,e");
    const innerNumericLiteral = innerVariableDeclaration.declarations[0].init;
    assertNumericLiteral(innerNumericLiteral);
    assert.equal(innerNumericLiteral.value, 24);
  });
});

// EXPRESSION STATEMENTS

describe(`getExpressionStatements`, () => {
  it("should find all expression statements", () => {
    assert.equal(t.getExpressionStatements().length, 6);
  });

  it("console expression statement", () => {
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
    assert.equal(binaryExpressionLeftLeft.name, "a");
    assert.equal(binaryExpressionLeftRight.name, "b");
    assert.equal(binaryExpressionRight.name, "c");
  });

  it("add expression statement", () => {
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
    assert.equal(addCalleeIdentifier.name, "add");
    const addArguments = addCallExpression.arguments;
    const addArgOneIdentifier = addArguments[0];
    assertIdentifier(addArgOneIdentifier);
    assert.equal(addArgOneIdentifier.name, "a");
    const addArgTwoIdentifier = addArguments[1];
    assertIdentifier(addArgTwoIdentifier);
    assert.equal(addArgTwoIdentifier.name, "b");
  });
});
// FUNCTION DECLARATIONS

describe(`getFunctionDeclarations`, () => {
  it("should find all function declarations", () => {
    assert.equal(t.getFunctionDeclarations().length, 2);
  });

  it("add function declaration", () => {
    const addFunction = t.getFunctionDeclarations().find((f) => {
      return f.id?.name === "add";
    });
    assertFunctionDeclaration(addFunction);
    assert.exists(addFunction);
    const addFunctionParams = addFunction.params;
    assert.equal(addFunctionParams.length, 2);
    const addFunctionParamOne = addFunctionParams[0];
    assertIdentifier(addFunctionParamOne);
    assert.equal(addFunctionParamOne.name, "param1");
    const addFunctionParamTwo = addFunctionParams[1];
    assertIdentifier(addFunctionParamTwo);
    assert.equal(addFunctionParamTwo.name, "param2");

    const totVariable = addFunction.body.body[0];
    assertVariableDeclaration(totVariable);
    const totVariableDeclarator = totVariable.declarations[0];
    assertVariableDeclarator(totVariableDeclarator);
    const totIdentifier = totVariableDeclarator.id;
    assertIdentifier(totIdentifier);
    assert.equal(totIdentifier.name, "tot");
    const totBinaryExpression = totVariableDeclarator.init;
    assertBinaryExpression(totBinaryExpression);
    const totBinaryLeftIdentifier = totBinaryExpression.left;
    assertIdentifier(totBinaryLeftIdentifier);
    assert.equal(totBinaryLeftIdentifier.name, "param1");
    const totBinaryRightIdentifier = totBinaryExpression.right;
    assertIdentifier(totBinaryRightIdentifier);
    assert.equal(totBinaryRightIdentifier.name, "param2");

    const returnStatement = addFunction.body.body.find((b) => {
      return b.type === "ReturnStatement";
    });
    assertReturnStatement(returnStatement);
    const returnStatementArgument = returnStatement.argument;
    assertIdentifier(returnStatementArgument);
    assert.equal(returnStatementArgument.name, "tot");
  });

  it("sub function declaration", () => {
    const subFunctionDeclaration = t.getFunctionDeclarations().find((f) => {
      return f.id?.name === "sub";
    });
    assertFunctionDeclaration(subFunctionDeclaration);
    assert.equal(subFunctionDeclaration.async, true);
  });
});
// ARROW FUNCTION EXPRESSIONS

describe(`getArrowFunctionExpressions`, () => {
  it("should find all arrow function expressions", () => {
    assert.equal(t.getArrowFunctionExpressions().length, 2);
  });

  it("IIFE arrow function expression", () => {
    const iIFEArrowFunctionExpression = t
      .getArrowFunctionExpressions()
      .find((a) => {
        return a.scope.join() === "global,sub";
      });
    assertArrowFunctionExpression(iIFEArrowFunctionExpression);
  });
});
// GENERIC TYPE HELPER

describe(`getType`, () => {
  it("b update expression", () => {
    const bUpdateExpression = t
      .getType<UpdateExpression>("UpdateExpression")
      .find((u) => {
        const updateExpressionArgument = u.argument;
        assertIdentifier(updateExpressionArgument);
        return updateExpressionArgument.name === "b";
      });
    assertUpdateExpression(bUpdateExpression);
    assert.equal(bUpdateExpression.scope.join(), "global,sub");
    assert.equal(bUpdateExpression.operator, "++");
  });

  describe("if statement", () => {
    const ifStatement = t.getType<IfStatement>("IfStatement")[0];
    it("exists", () => {
      assertIfStatement(ifStatement);
      assert.exists(ifStatement);
    });
    describe(`.test`, () => {
      const optionalMemberExpression = ifStatement.test;
      assertOptionalMemberExpression(optionalMemberExpression);
      it("is optional", () => {
        assert.isTrue(optionalMemberExpression.optional);
      });
      describe(`.object`, () => {
        const memberExpression = optionalMemberExpression.object;
        assertMemberExpression(memberExpression);

        describe(`.object`, () => {
          const objectIdentifier = memberExpression.object;
          assertIdentifier(objectIdentifier);
          it("complexType", () => {
            assert.equal(objectIdentifier.name, "complexType");
          });
        });

        describe(`.property`, () => {
          const propertyIdentifier = memberExpression.property;
          assertIdentifier(propertyIdentifier);
          it("c", () => {
            assert.equal(propertyIdentifier.name, "c");
          });
        });
      });
      describe(`.property`, () => {
        const propertyIdentifier = optionalMemberExpression.property;
        it("exists", () => {
          assertIdentifier(propertyIdentifier);
          assert.exists(propertyIdentifier);
        });
        const ifBlockStatement = ifStatement.consequent;
        const ifAlternate = ifStatement.alternate;
      });
    });
    describe(`.consequent`, () => {});
    describe(`.alternate`, () => {});
  });
});

// getExpressionStatement

describe(`getExpressionStatement`, () => {
  describe(`console.log`, () => {
    const consoleExpressionStatement = t.getExpressionStatement("console.log");
    it("exists", () => {
      assert.exists(consoleExpressionStatement);
    });
  });
  describe(`add`, () => {
    const addExpressionStatement = t.getExpressionStatement("add");
    it("exists", () => {
      assert.exists(addExpressionStatement);
    });
  });
  describe(`sub`, () => {
    const subExpressionStatement = t.getExpressionStatement("sub");
    it("exists", () => {
      assert.exists(subExpressionStatement);
    });
  });
});

// generateCode

describe(`generateCode`, () => {
  it("should generate code", () => {
    const addExpressionStatement = t.getExpressionStatement("add");
    assertExpressionStatement(addExpressionStatement);
    const code = t.generateCode(addExpressionStatement);
    assert.equal(code, "add(a, b);");
  });
});

describe(`.scope`, () => {
  it("should return the scope", () => {
    const addExpressionStatement = t.getExpressionStatement("add");
    assertExpressionStatement(addExpressionStatement);
    assert.equal(addExpressionStatement.scope.join(), "global");
  });
});

// getLineAndColumnFromIndex

describe(`getLineAndColumnFromIndex`, () => {
  it("should return the line and column", () => {
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
    assert.equal(lineAndColumn.line, 5);
    assert.equal(lineAndColumn.column, 0);
  });
});

function assertNumber(n: unknown): asserts n is number {
  assert.isNumber(n);
}
